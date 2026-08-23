import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveEvent } from "@/lib/event";
import { requireAdminUser } from "@/lib/supabase-admin-session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { correoGrillaHtml, sendEventEmail } from "@/lib/email";
import { referenciaDe } from "@/lib/identificador";
import { getSiteUrl } from "@/lib/site-url";
import {
  agruparEnGrilla,
  calcularHoras,
  horaAMinutos,
  usaGrilla,
} from "@/lib/grilla";
import {
  leerCorredores,
  leerCorredoresParaEnvio,
  leerEstadoGrilla,
  leerOrdenCategorias,
} from "@/lib/grilla-db";
import { describeError, logError, logInfo, logWarn } from "@/lib/logger";

/**
 * Acciones de la grilla de salida. Cada una es independiente a propósito:
 * sortear NO calcula horas y calcular horas NO re-sortea. El día antes de la
 * carrera hay que poder mover la hora de inicio sin miedo a que se rebaraje
 * todo el orden que ya se comunicó.
 */
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reordenar-categorias"),
    orden: z.array(z.string().trim().min(1)).min(1).max(50),
  }),
  z.object({
    action: z.literal("sortear"),
    /**
     * Obligatorio cuando ya hay un sorteo hecho. El servidor lo exige además
     * del diálogo del navegador: un re-sorteo tira a la basura el orden que
     * ya se le comunicó a la gente, y eso no puede depender solo del cliente.
     */
    confirmar: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("calcular-horas"),
    horaInicio: z
      .string()
      .trim()
      .regex(/^\d{1,2}:\d{2}$/, "La hora de inicio va en formato HH:MM"),
    intervaloMin: z.number().int().min(1).max(60),
  }),
  z.object({
    action: z.literal("enviar-correos"),
    /** false = reenviar también a quien ya lo recibió */
    soloFaltantes: z.boolean().optional(),
  }),
]);

/**
 * Cuántos correos se mandan por llamada.
 *
 * El envío NO se hace de un tirón: el navegador llama a esta ruta las veces
 * que haga falta y va mostrando el avance. Así un lote largo no choca contra
 * el límite de tiempo de la función, y —más importante— cada correo queda
 * marcado en cuanto sale, así que un corte a media lista se reanuda sin
 * volver a escribirle a nadie.
 */
const LOTE = 10;

/** Resend admite 2 peticiones por segundo; se va por debajo a propósito */
const ESPERA_MS = 550;

export const maxDuration = 60;

export async function POST(request: Request) {
  const event = getActiveEvent();
  if (!usaGrilla(event)) {
    return NextResponse.json(
      { error: "Este evento no usa grilla de salida." },
      { status: 404 },
    );
  }

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

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Solicitud inválida." },
      { status: 400 },
    );
  }
  const body = parsed.data;

  /** Deja constancia en evento_grilla de lo que se acaba de hacer */
  async function marcarGrilla(campos: Record<string, unknown>) {
    const { error } = await supabase!.from("evento_grilla").upsert(
      {
        event_slug: event.slug,
        ...campos,
        updated_at: new Date().toISOString(),
        updated_by: user!.id,
      },
      { onConflict: "event_slug" },
    );
    if (error) {
      logError(`No se pudo actualizar evento_grilla de ${event.slug}`, error);
      throw error;
    }
  }

  try {
    switch (body.action) {
      // ── Orden en que salen las categorías ─────────────────────────────
      case "reordenar-categorias": {
        const validas = new Set(event.categories.map((c) => c.id));
        const desconocidas = body.orden.filter((id) => !validas.has(id));
        if (desconocidas.length > 0) {
          return NextResponse.json(
            { error: `Categorías desconocidas: ${desconocidas.join(", ")}` },
            { status: 400 },
          );
        }
        const { error } = await supabase.from("evento_categorias").upsert(
          body.orden.map((categoria, i) => ({
            event_slug: event.slug,
            categoria,
            posicion: i,
          })),
          { onConflict: "event_slug,categoria" },
        );
        if (error) throw error;
        logInfo(`Orden de categorías de ${event.slug}: ${body.orden.join(" → ")}`);
        // El orden manda sobre las horas: si ya estaban calculadas, ahora
        // están desfasadas y hay que decirlo en vez de dejar horas mentirosas.
        const estado = await leerEstadoGrilla(supabase, event.slug);
        return NextResponse.json({
          ok: true,
          horasDesfasadas: Boolean(estado?.horas_calculadas_at),
        });
      }

      // ── El sorteo, una sola vez ───────────────────────────────────────
      case "sortear": {
        const estado = await leerEstadoGrilla(supabase, event.slug);
        if (estado?.sorteada_at && !body.confirmar) {
          return NextResponse.json(
            {
              error:
                "La grilla ya fue sorteada. Volver a sortear reemplaza el orden " +
                "de TODOS los corredores.",
              requiereConfirmacion: true,
              sorteadaAt: estado.sorteada_at,
            },
            { status: 409 },
          );
        }

        const { data, error } = await supabase.rpc("sortear_grilla", {
          p_event_slug: event.slug,
        });
        if (error) throw error;
        const total = typeof data === "number" ? data : 0;

        // Las horas de antes ya no valen: correspondían a otro orden. Se
        // borra la marca para que la pantalla pida recalcular en vez de
        // enseñar horas que no se corresponden con el sorteo nuevo.
        await marcarGrilla({
          sorteada_at: new Date().toISOString(),
          horas_calculadas_at: null,
        });
        logInfo(`Grilla de ${event.slug} sorteada: ${total} corredores`);
        return NextResponse.json({ ok: true, total });
      }

      // ── Las horas: aritmética pura sobre el orden ya fijado ───────────
      case "calcular-horas": {
        if (horaAMinutos(body.horaInicio) === null) {
          return NextResponse.json(
            { error: "La hora de inicio no es válida." },
            { status: 400 },
          );
        }
        const corredores = await leerCorredores(supabase, event.slug);
        const conTurno = corredores.filter((c) => c.salida_orden !== null);
        if (conTurno.length === 0) {
          return NextResponse.json(
            {
              error:
                "Todavía no hay orden de salida: sortea la grilla antes de " +
                "calcular las horas.",
            },
            { status: 409 },
          );
        }

        const orden = await leerOrdenCategorias(supabase, event);
        const grupos = agruparEnGrilla(conTurno, orden, (id) => id ?? "—");
        const horas = calcularHoras(grupos, {
          horaInicio: body.horaInicio,
          intervaloMin: body.intervaloMin,
        });

        const { error } = await supabase.rpc("guardar_horas_grilla", {
          p_event_slug: event.slug,
          p_horas: [...horas].map(([id, hora]) => ({ id, hora })),
        });
        if (error) throw error;

        await marcarGrilla({
          hora_inicio: body.horaInicio,
          intervalo_min: body.intervaloMin,
          horas_calculadas_at: new Date().toISOString(),
        });
        const ultima = [...horas.values()].at(-1) ?? body.horaInicio;
        logInfo(
          `Horas de ${event.slug}: ${horas.size} corredores, ${body.horaInicio}–${ultima}`,
        );
        return NextResponse.json({
          ok: true,
          total: horas.size,
          primera: [...horas.values()][0] ?? null,
          ultima,
        });
      }

      // ── El envío, por lotes y reanudable ──────────────────────────────
      case "enviar-correos": {
        const corredores = await leerCorredoresParaEnvio(supabase, event.slug);
        const conHora = corredores
          .filter((c) => c.salida_hora)
          .sort((a, b) => (a.salida_hora ?? "").localeCompare(b.salida_hora ?? ""));
        if (conHora.length === 0) {
          return NextResponse.json(
            {
              error:
                "Nadie tiene hora de salida todavía. Sortea la grilla y calcula " +
                "las horas antes de enviar.",
            },
            { status: 409 },
          );
        }

        const soloFaltantes = body.soloFaltantes !== false;
        const pendientes = soloFaltantes
          ? conHora.filter((c) => !c.correo_grilla_at)
          : conHora;
        if (pendientes.length === 0) {
          return NextResponse.json({
            ok: true,
            enviados: 0,
            fallidos: 0,
            restantes: 0,
            total: conHora.length,
          });
        }

        const urlGrilla = `${getSiteUrl(event)}/grilla`;
        const lote = pendientes.slice(0, LOTE);
        let enviados = 0;
        const fallidos: { nombre: string; email: string; razon: string }[] = [];

        for (const [i, corredor] of lote.entries()) {
          // Espaciado entre correos para no chocar con el límite de Resend
          if (i > 0) await new Promise((r) => setTimeout(r, ESPERA_MS));

          const categoria = corredor.categoria
            ? (event.categories.find((c) => c.id === corredor.categoria)?.name ??
              corredor.categoria)
            : null;
          const { sent, reason } = await sendEventEmail({
            event,
            to: corredor.email,
            subject: `Tu hora de salida — ${event.name}`,
            html: correoGrillaHtml(
              event,
              corredor.nombre,
              (corredor.salida_hora ?? "").slice(0, 5),
              categoria,
              referenciaDe(event, corredor),
              urlGrilla,
            ),
          });

          if (!sent) {
            logWarn(`Grilla: sin correo para ${corredor.id}: ${reason}`);
            fallidos.push({
              nombre: corredor.nombre,
              email: corredor.email,
              razon: reason ?? "razón desconocida",
            });
            continue;
          }
          enviados++;
          // Se marca en cuanto sale, uno por uno: si esta llamada se corta
          // aquí mismo, los que ya salieron no se repiten al reanudar.
          const { error: marcaError } = await supabase
            .from("inscripciones")
            .update({ correo_grilla_at: new Date().toISOString() })
            .eq("id", corredor.id);
          if (marcaError) {
            logError(
              `Grilla: correo enviado a ${corredor.id} pero no se pudo marcar`,
              marcaError,
            );
          }
        }

        await marcarGrilla({ correos_enviados_at: new Date().toISOString() });
        const restantes = Math.max(pendientes.length - lote.length, 0);
        logInfo(
          `Grilla ${event.slug}: lote de ${lote.length} · ${enviados} enviados, ` +
            `${fallidos.length} fallidos, ${restantes} por delante`,
        );
        return NextResponse.json({
          ok: true,
          enviados,
          fallidos,
          restantes,
          total: conHora.length,
        });
      }
    }
  } catch (error) {
    logError(`Acción de grilla "${body.action}" falló`, error);
    return NextResponse.json(
      { error: `No se pudo completar la acción: ${describeError(error)}` },
      { status: 500 },
    );
  }
}
