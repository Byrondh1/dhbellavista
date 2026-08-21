import { NextResponse } from "next/server";
import { getActiveEvent } from "@/lib/event";
import { requireAdminUser } from "@/lib/supabase-admin-session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { InscripcionRow } from "@/lib/inscripciones";
import {
  buildRegistrationSchema,
  DEFAULT_CONSENT_TEXT,
} from "@/lib/registration-schema";
import { confirmarInscripcion } from "@/lib/confirmar-inscripcion";
import { enviarCorreoPresencial, rowParaCorreo } from "@/lib/inscripcion-emails";
import { identificadorDe, refDe } from "@/lib/identificador";
import { describeError, logError, logInfo, logWarn } from "@/lib/logger";

/**
 * Alta presencial: el corredor llega el día del evento, paga en efectivo en el
 * mostrador y se va con su número en la mano.
 *
 * En un solo POST hace lo que online son tres pasos separados (inscribirse,
 * pagar, verificar): guarda, cobra, sortea el dorsal y manda el correo. Es
 * deliberado — en la fila no hay tiempo para volver a una pantalla.
 *
 * NO consulta el candado de inscripciones (ni el del config ni el del panel):
 * este mostrador existe justamente para cuando las inscripciones online ya
 * están cerradas. Lo que sí manda siempre es el cupo de dorsales.
 */
export async function POST(request: Request) {
  const event = getActiveEvent();
  const form = event.registrationForm;

  if (!form) {
    return NextResponse.json(
      { error: "Este evento no tiene módulo de inscripciones." },
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

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  // Mismo esquema que el formulario público: los datos que se piden y cómo se
  // validan no pueden divergir según por dónde entre la inscripción.
  const parsed = buildRegistrationSchema(event).safeParse({
    nombre: body.nombre,
    email: body.email,
    categoria: form.fields.categoria ? body.categoria : undefined,
    placa: form.fields.placa ? body.placa : undefined,
    copiloto: form.fields.copiloto ? body.copiloto : undefined,
    telefono: body.telefono,
    cedula: form.fields.cedula ? body.cedula : undefined,
    ciudad: form.fields.ciudad ? body.ciudad : undefined,
    emergenciaNombre: form.fields.emergencyContact
      ? body.emergenciaNombre
      : undefined,
    emergenciaTelefono: form.fields.emergencyContact
      ? body.emergenciaTelefono
      : undefined,
    club: body.club,
    consentimiento: body.consentimiento,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Revisa los datos ingresados." },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const ahora = new Date().toISOString();

  try {
    // 1. La fila entra como cualquier otra, pero ya cobrada: el efectivo está
    //    sobre la mesa en este mismo momento, así que la marca y el timestamp
    //    del cobro se ponen juntos (la restricción de la 0009 exige que
    //    pago_cobrado_at venga acompañado de pago_en_sitio).
    const { data: insertada, error: insertError } = await supabase
      .from("inscripciones")
      .insert({
        event_slug: event.slug,
        nombre: input.nombre,
        email: input.email,
        cedula: input.cedula ?? null,
        categoria: input.categoria ?? null,
        ciudad: input.ciudad ?? null,
        telefono: input.telefono,
        placa: input.placa ?? null,
        copiloto: input.copiloto || null,
        emergencia_nombre: input.emergenciaNombre ?? null,
        emergencia_telefono: input.emergenciaTelefono ?? null,
        club: input.club || null,
        consentimiento_at: ahora,
        consentimiento_texto: form.consentText ?? DEFAULT_CONSENT_TEXT,
        pago_en_sitio: true,
        pago_cobrado_at: ahora,
        pago_cobrado_por: user.id,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const detalle = `${insertError.message} ${insertError.details ?? ""}`;
        return NextResponse.json(
          {
            error: detalle.includes("placa")
              ? "Ese vehículo ya está inscrito. Búscalo en el panel."
              : "Ya existe una inscripción con esa cédula. Búscala en el panel.",
          },
          { status: 409 },
        );
      }
      throw insertError;
    }
    const id = insertada.id as string;
    logInfo(`Alta presencial ${id} guardada por ${user.id} (${event.slug})`);

    // 2. El sorteo del dorsal: exactamente el mismo camino que la
    //    confirmación de un pago online.
    const confirmacion = await confirmarInscripcion(supabase, event, id);
    if (!confirmacion.ok) {
      // Nada que conservar: no se envió correo ni se entregó número, y dejar
      // la fila pendiente ocuparía la cédula y la placa de alguien que se va
      // sin inscribir. El efectivo se le devuelve en el mostrador.
      const { error: rollbackError } = await supabase
        .from("inscripciones")
        .delete()
        .eq("id", id)
        .eq("event_slug", event.slug);
      if (rollbackError) {
        logError(
          `Alta presencial ${id}: falló el sorteo y tampoco se pudo borrar la fila`,
          rollbackError,
        );
      }
      if (confirmacion.cupoLleno) {
        logWarn(`Alta presencial rechazada: cupo de dorsales lleno (${event.slug}).`);
        return NextResponse.json(
          {
            error:
              "No quedan dorsales libres: el cupo del evento está lleno. " +
              "No se registró la inscripción ni se cobró nada.",
            cupoLleno: true,
          },
          { status: 409 },
        );
      }
      throw confirmacion.error;
    }

    // 3. La fila re-leída es la fuente del dorsal que se le canta al corredor
    const { data: freshData, error: freshError } = await supabase
      .from("inscripciones")
      .select("*")
      .eq("id", id)
      .single();
    if (freshError || !freshData) {
      logError(`Alta presencial ${id}: no se pudo re-leer la fila`, freshError);
      return NextResponse.json(
        {
          error:
            "La inscripción se guardó, pero no se pudo leer el número asignado. " +
            "Búscala en el panel.",
        },
        { status: 500 },
      );
    }
    const row = freshData as InscripcionRow;
    const ident = identificadorDe(event);
    const referencia = refDe(row, ident);
    logInfo(
      `Alta presencial ${id} confirmada · ${ident.label} ${referencia ?? "—"}`,
    );

    // 4. El correo, con su texto propio de pago en efectivo. Como en todo el
    //    módulo, no decide el resultado: el corredor ya tiene su número y la
    //    inscripción está hecha aunque Resend falle.
    const categoria = row.categoria
      ? (event.categories.find((c) => c.id === row.categoria)?.name ??
        row.categoria)
      : null;
    const { sent, reason } = await enviarCorreoPresencial(
      event,
      rowParaCorreo(row),
      categoria,
    );
    let emailError = reason;
    if (sent) {
      const { error: marcaError } = await supabase
        .from("inscripciones")
        .update({ correo_confirmada_at: new Date().toISOString() })
        .eq("id", id);
      if (marcaError) {
        logError(`No se pudo marcar correo_confirmada_at en ${id}`, marcaError);
        emailError = `timestamp-error: ${describeError(marcaError)}`;
      }
    } else {
      logWarn(`Alta presencial ${id} sin correo: ${reason}`);
    }

    return NextResponse.json(
      {
        ok: true,
        id,
        nombre: row.nombre,
        email: row.email,
        identLabel: ident.label,
        referencia,
        categoria,
        emailSent: sent,
        ...(emailError && { emailError }),
      },
      { status: 201 },
    );
  } catch (error) {
    logError("Alta presencial falló", error);
    return NextResponse.json(
      { error: "No se pudo registrar la inscripción. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
