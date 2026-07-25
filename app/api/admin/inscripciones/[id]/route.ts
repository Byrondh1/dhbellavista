import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveEvent } from "@/lib/event";
import { requireAdminUser } from "@/lib/supabase-admin-session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { InscripcionRow } from "@/lib/inscripciones";
import {
  enviarCorreoConfirmada,
  enviarCorreoRecibida,
  rowParaCorreo,
} from "@/lib/inscripcion-emails";

const actionSchema = z.object({
  action: z.enum(["verificar", "rechazar", "reenviar-correo", "checkin"]),
  motivo: z.string().trim().max(300).optional(),
});

/**
 * Acciones del panel sobre una inscripción. La sesión del admin se valida
 * aquí (además del proxy); las mutaciones se ejecutan con service
 * role. Los correos jamás deciden el resultado de la acción: se reportan
 * con emailSent y pueden reenviarse.
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

  // La inscripción debe pertenecer al evento de este sitio
  const { data } = await supabase
    .from("inscripciones")
    .select("*")
    .eq("id", id)
    .eq("event_slug", event.slug)
    .maybeSingle();
  if (!data) {
    return NextResponse.json({ error: "Inscripción no encontrada." }, { status: 404 });
  }
  const row = data as InscripcionRow;
  const now = () => new Date().toISOString();

  try {
    switch (action) {
      case "verificar": {
        const { data: updatedData, error } = await supabase.rpc(
          "verificar_inscripcion",
          { p_id: id },
        );
        if (error) throw error;
        const updated = updatedData as InscripcionRow;

        // Correo 2 solo si nunca salió (idempotente ante doble clic);
        // para repetirlo existe la acción reenviar-correo
        let emailSent = false;
        if (!updated.correo_confirmada_at) {
          ({ sent: emailSent } = await enviarCorreoConfirmada(
            event,
            rowParaCorreo(updated),
          ));
          if (emailSent) {
            await supabase
              .from("inscripciones")
              .update({ correo_confirmada_at: now() })
              .eq("id", id);
          }
        }
        return NextResponse.json({ ok: true, inscripcion: updated, emailSent });
      }

      case "rechazar": {
        const { data: updated, error } = await supabase
          .from("inscripciones")
          .update({
            estado: "rechazada",
            rechazada_at: now(),
            rechazo_motivo: motivo ?? null,
            dorsal: null,
            verificada_at: null,
          })
          .eq("id", id)
          .eq("event_slug", event.slug)
          .select()
          .single();
        if (error) throw error;
        // TODO(D3): correo de rechazo en tono "acción requerida" con el
        // motivo y CTA de WhatsApp del organizador.
        return NextResponse.json({ ok: true, inscripcion: updated });
      }

      case "reenviar-correo": {
        if (row.estado === "rechazada") {
          return NextResponse.json(
            { error: "Una inscripción rechazada no tiene correo para reenviar." },
            { status: 400 },
          );
        }
        const esConfirmada = row.estado === "verificada";
        const { sent } = esConfirmada
          ? await enviarCorreoConfirmada(event, rowParaCorreo(row))
          : await enviarCorreoRecibida(event, rowParaCorreo(row));
        if (sent) {
          await supabase
            .from("inscripciones")
            .update(
              esConfirmada
                ? { correo_confirmada_at: now() }
                : { correo_recibida_at: now() },
            )
            .eq("id", id);
        }
        return NextResponse.json(
          sent
            ? { ok: true, emailSent: true }
            : { error: "No se pudo enviar el correo. Revisa los logs." },
          { status: sent ? 200 : 502 },
        );
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
          .update({ asistio_at: now() })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({
          ok: true,
          yaPresente: false,
          asistio_at: (updated as InscripcionRow).asistio_at,
        });
      }
    }
  } catch (error) {
    console.error(`Error en acción admin "${action}":`, error);
    return NextResponse.json(
      { error: "No se pudo completar la acción. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
