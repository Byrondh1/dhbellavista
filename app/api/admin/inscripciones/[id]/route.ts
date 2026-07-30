import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveEvent } from "@/lib/event";
import { requireAdminUser } from "@/lib/supabase-admin-session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { InscripcionRow } from "@/lib/inscripciones";
import {
  enviarCorreoConfirmada,
  enviarCorreoRechazo,
  enviarCorreoRecibida,
  rowParaCorreo,
} from "@/lib/inscripcion-emails";
import { describeError, logError, logInfo, logWarn } from "@/lib/logger";

const actionSchema = z.object({
  action: z.enum([
    "verificar",
    "revertir-verificacion",
    "rechazar",
    "reenviar-correo",
    "checkin",
    "deshacer-checkin",
  ]),
  motivo: z.string().trim().max(300).optional(),
});

/** Marca el timestamp del correo enviado, reportando el error si el write falla */
async function marcarCorreoEnviado(
  supabase: SupabaseClient,
  id: string,
  columna: "correo_recibida_at" | "correo_confirmada_at" | "correo_rechazo_at",
): Promise<string | undefined> {
  const { error } = await supabase
    .from("inscripciones")
    .update({ [columna]: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    // El correo YA salió: este fallo solo afecta el registro del envío, por
    // eso se reporta sin revertir nada (antes se ignoraba en silencio).
    logError(`No se pudo marcar ${columna} en ${id}`, error);
    return `timestamp-error: ${describeError(error)}`;
  }
  logInfo(`${columna} marcado en ${id}`);
  return undefined;
}

/**
 * Acciones del panel sobre una inscripción. La sesión del admin se valida
 * aquí (además del proxy); las mutaciones se ejecutan con service role.
 *
 * Los correos jamás deciden el resultado de la acción, pero cada intento y
 * cada fallo queda registrado y se devuelve en `emailError` para que el
 * panel muestre la razón real en lugar de fallar en silencio.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const event = getActiveEvent();

  const { supabase: session, user } = await requireAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Supabase no configurado." }, { status: 503 });
  }
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no configurado." }, { status: 503 });
  }

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  const { action, motivo } = parsed.data;
  logInfo(`Acción admin "${action}" sobre ${id} (${event.slug})`);

  // La inscripción debe pertenecer al evento de este sitio
  const { data, error: readError } = await supabase
    .from("inscripciones")
    .select("*")
    .eq("id", id)
    .eq("event_slug", event.slug)
    .maybeSingle();
  if (readError) {
    logError(`No se pudo leer la inscripción ${id}`, readError);
    return NextResponse.json(
      { error: "No se pudo leer la inscripción." },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json({ error: "Inscripción no encontrada." }, { status: 404 });
  }
  const row = data as InscripcionRow;

  try {
    switch (action) {
      case "verificar": {
        const { data: rpcData, error } = await supabase.rpc(
          "verificar_inscripcion",
          { p_id: id },
        );
        if (error) throw error;
        logInfo(
          `RPC verificar_inscripcion devolvió ${Array.isArray(rpcData) ? "array" : typeof rpcData}`,
          rpcData && typeof rpcData === "object"
            ? Object.keys(rpcData as object)
            : rpcData,
        );

        // No se confía en la forma que devuelve la RPC (composite type): la
        // fuente autoritativa para el correo es una re-lectura de la fila.
        const { data: freshData, error: freshError } = await supabase
          .from("inscripciones")
          .select("*")
          .eq("id", id)
          .single();
        if (freshError || !freshData) {
          logError(
            `Verificada, pero no se pudo re-leer la fila ${id} para el correo`,
            freshError,
          );
          return NextResponse.json({
            ok: true,
            emailSent: false,
            emailError: `relectura-error: ${describeError(freshError)}`,
          });
        }
        const updated = freshData as InscripcionRow;
        logInfo(
          `Inscripción ${id} verificada · estado=${updated.estado} dorsal=${updated.dorsal} correo_confirmada_at=${updated.correo_confirmada_at ?? "null"}`,
        );

        // Correo 2 solo si nunca salió (idempotente ante doble clic);
        // para repetirlo existe la acción reenviar-correo
        if (updated.correo_confirmada_at) {
          logWarn(
            `Correo 2 omitido en ${id}: ya se había enviado el ${updated.correo_confirmada_at}. Usa "Reenviar correo" para repetirlo.`,
          );
          return NextResponse.json({
            ok: true,
            inscripcion: updated,
            emailSent: false,
            emailError: "ya-enviado",
          });
        }

        const { sent, reason } = await enviarCorreoConfirmada(
          event,
          rowParaCorreo(updated),
        );
        let emailError = reason;
        if (sent) {
          emailError = await marcarCorreoEnviado(
            supabase,
            id,
            "correo_confirmada_at",
          );
        }
        return NextResponse.json({
          ok: true,
          inscripcion: updated,
          emailSent: sent,
          ...(emailError && { emailError }),
        });
      }

      case "revertir-verificacion": {
        // Deshace una verificación hecha por error. Un solo UPDATE (atómico
        // en Postgres) deja la fila coherente: sin dorsal, sin timestamps de
        // verificación ni de correo —para que al re-verificar salga el
        // Correo 2— y sin check-in, porque una inscripción pendiente no
        // puede figurar como presente.
        // La condición sobre estado evita pisar datos si otra pestaña ya la
        // revirtió o la rechazó entretanto.
        const { data: updatedData, error } = await supabase
          .from("inscripciones")
          .update({
            estado: "pendiente",
            dorsal: null,
            verificada_at: null,
            correo_confirmada_at: null,
            asistio_at: null,
          })
          .eq("id", id)
          .eq("event_slug", event.slug)
          .eq("estado", "verificada")
          .select()
          .maybeSingle();
        if (error) throw error;
        if (!updatedData) {
          logWarn(
            `Revertir omitido en ${id}: ya no estaba verificada (estado actual: ${row.estado}).`,
          );
          return NextResponse.json(
            {
              error: `La inscripción ya no está verificada (estado actual: ${row.estado}). Recarga la página.`,
            },
            { status: 409 },
          );
        }
        logInfo(
          `Verificación revertida en ${id} · dorsal ${row.dorsal ?? "—"} liberado${row.asistio_at ? " · se borró el check-in" : ""}`,
        );
        return NextResponse.json({
          ok: true,
          inscripcion: updatedData as InscripcionRow,
          dorsalLiberado: row.dorsal,
          checkinBorrado: Boolean(row.asistio_at),
        });
      }

      case "rechazar": {
        const { data: updatedData, error } = await supabase
          .from("inscripciones")
          .update({
            estado: "rechazada",
            rechazada_at: new Date().toISOString(),
            rechazo_motivo: motivo ?? null,
            dorsal: null,
            verificada_at: null,
            // Se limpia el registro del Correo 2: si la inscripción se
            // corrige y se vuelve a verificar, debe enviarse de nuevo (con
            // el dorsal nuevo). Sin esto, el guard de idempotencia lo
            // omitiría en silencio.
            correo_confirmada_at: null,
          })
          .eq("id", id)
          .eq("event_slug", event.slug)
          .select()
          .single();
        if (error) throw error;
        const updated = updatedData as InscripcionRow;
        logInfo(`Inscripción ${id} rechazada${motivo ? ` · motivo: ${motivo}` : ""}`);

        const { sent, reason } = await enviarCorreoRechazo(
          event,
          rowParaCorreo(updated),
          motivo,
        );
        let emailError = reason;
        if (sent) {
          emailError = await marcarCorreoEnviado(
            supabase,
            id,
            "correo_rechazo_at",
          );
        }
        return NextResponse.json({
          ok: true,
          inscripcion: updated,
          emailSent: sent,
          ...(emailError && { emailError }),
        });
      }

      case "reenviar-correo": {
        // El correo que corresponde depende del estado actual
        const correoPorEstado = {
          pendiente: {
            etiqueta: "Correo 1",
            columna: "correo_recibida_at" as const,
            enviar: () => enviarCorreoRecibida(event, rowParaCorreo(row)),
          },
          verificada: {
            etiqueta: "Correo 2",
            columna: "correo_confirmada_at" as const,
            enviar: () => enviarCorreoConfirmada(event, rowParaCorreo(row)),
          },
          rechazada: {
            etiqueta: "correo de rechazo",
            columna: "correo_rechazo_at" as const,
            enviar: () =>
              enviarCorreoRechazo(event, rowParaCorreo(row), row.rechazo_motivo),
          },
        }[row.estado];

        logInfo(
          `Reenviando ${correoPorEstado.etiqueta} de ${id} a ${row.email}`,
        );
        const { sent, reason } = await correoPorEstado.enviar();
        if (!sent) {
          return NextResponse.json(
            { error: `No se pudo enviar el correo (${reason ?? "razón desconocida"}).` },
            { status: 502 },
          );
        }
        const emailError = await marcarCorreoEnviado(
          supabase,
          id,
          correoPorEstado.columna,
        );
        return NextResponse.json({
          ok: true,
          emailSent: true,
          ...(emailError && { emailError }),
        });
      }

      case "checkin": {
        if (row.estado !== "verificada") {
          return NextResponse.json(
            { error: "Solo se puede registrar asistencia de inscripciones verificadas." },
            { status: 409 },
          );
        }
        if (row.asistio_at) {
          return NextResponse.json({
            ok: true,
            yaPresente: true,
            asistio_at: row.asistio_at,
          });
        }
        const { data: updated, error } = await supabase
          .from("inscripciones")
          .update({ asistio_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        logInfo(`Check-in registrado para ${id} (dorsal ${row.dorsal})`);
        return NextResponse.json({
          ok: true,
          yaPresente: false,
          asistio_at: (updated as InscripcionRow).asistio_at,
        });
      }

      case "deshacer-checkin": {
        // Para corregir un escaneo equivocado en la acreditación
        if (!row.asistio_at) {
          return NextResponse.json({ ok: true, asistio_at: null });
        }
        const { error } = await supabase
          .from("inscripciones")
          .update({ asistio_at: null })
          .eq("id", id)
          .eq("event_slug", event.slug);
        if (error) throw error;
        logInfo(`Check-in deshecho para ${id} (dorsal ${row.dorsal})`);
        return NextResponse.json({ ok: true, asistio_at: null });
      }
    }
  } catch (error) {
    logError(`Acción admin "${action}" sobre ${id} falló`, error);
    return NextResponse.json(
      { error: "No se pudo completar la acción. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
