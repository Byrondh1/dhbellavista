import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveEvent } from "@/lib/event";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import {
  buildRegistrationSchema,
  COMPROBANTE_MAX_BYTES,
  COMPROBANTE_TYPES,
} from "@/lib/registration-schema";

/**
 * Recibe una inscripción del modal: valida, guarda en Supabase y sube el
 * comprobante al bucket privado. El evento activo se resuelve en build,
 * así que cada sitio solo acepta inscripciones de su propio evento.
 */
export async function POST(request: Request) {
  const event = getActiveEvent();
  const form = event.registrationForm;

  if (event.registrationCta.mode !== "modal" || !form) {
    return NextResponse.json(
      { error: "Las inscripciones en línea no están habilitadas." },
      { status: 404 },
    );
  }
  if (form.closed) {
    return NextResponse.json(
      { error: "Las inscripciones están cerradas." },
      { status: 403 },
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Las inscripciones en línea aún no están disponibles. Inscríbete por WhatsApp mientras tanto.",
      },
      { status: 503 },
    );
  }

  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  // Honeypot anti-spam: los bots rellenan este campo oculto; se responde
  // como éxito para no darles señal, pero no se guarda nada.
  if (data.get("website")) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const parsed = buildRegistrationSchema(event).safeParse({
    nombre: data.get("nombre") ?? undefined,
    email: data.get("email") ?? undefined,
    categoria: data.get("categoria") ?? undefined,
    telefono: data.get("telefono") ?? undefined,
    cedula: form.fields.cedula ? (data.get("cedula") ?? undefined) : undefined,
    ciudad: form.fields.ciudad ? (data.get("ciudad") ?? undefined) : undefined,
    emergenciaNombre: form.fields.emergencyContact
      ? (data.get("emergenciaNombre") ?? undefined)
      : undefined,
    emergenciaTelefono: form.fields.emergencyContact
      ? (data.get("emergenciaTelefono") ?? undefined)
      : undefined,
    club: data.get("club") ?? undefined,
  });
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "Revisa los datos ingresados.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const input = parsed.data;

  const rawComprobante = data.get("comprobante");
  const file =
    rawComprobante instanceof File && rawComprobante.size > 0
      ? rawComprobante
      : null;
  if (form.comprobante && !file) {
    return NextResponse.json(
      { error: "Adjunta el comprobante de la transferencia." },
      { status: 400 },
    );
  }
  if (file) {
    if (!COMPROBANTE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "El comprobante debe ser una imagen (JPG/PNG/WebP) o PDF." },
        { status: 400 },
      );
    }
    if (file.size > COMPROBANTE_MAX_BYTES) {
      return NextResponse.json(
        { error: "El comprobante no puede superar los 5 MB." },
        { status: 400 },
      );
    }
  }

  try {
    return await persist(supabase);
  } catch (error) {
    console.error("Error inesperado guardando inscripción:", error);
    return NextResponse.json(
      { error: "No pudimos guardar tu inscripción. Intenta de nuevo." },
      { status: 500 },
    );
  }

  async function persist(sb: SupabaseClient) {
    const { data: row, error: insertError } = await sb
      .from("inscripciones")
      .insert({
        event_slug: event.slug,
        nombre: input.nombre,
        email: input.email,
        cedula: input.cedula ?? null,
        categoria: input.categoria,
        ciudad: input.ciudad ?? null,
        telefono: input.telefono,
        emergencia_nombre: input.emergenciaNombre ?? null,
        emergencia_telefono: input.emergenciaTelefono ?? null,
        club: input.club || null,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Ya existe una inscripción con esa cédula para este evento." },
          { status: 409 },
        );
      }
      console.error("Error insertando inscripción:", insertError);
      return NextResponse.json(
        { error: "No pudimos guardar tu inscripción. Intenta de nuevo." },
        { status: 500 },
      );
    }

    if (file) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${event.slug}/${row.id}.${extension}`;
      const { error: uploadError } = await sb.storage
        .from("comprobantes")
        .upload(path, file, { contentType: file.type });
      if (uploadError) {
        console.error("Error subiendo comprobante:", uploadError);
        // La inscripción ya existe; se registra sin comprobante y el admin
        // podrá pedirlo por WhatsApp al verificar.
      } else {
        await sb
          .from("inscripciones")
          .update({ comprobante_path: path })
          .eq("id", row.id);
      }
    }

    // TODO(M2): disparar Correo 1 con Resend ("inscripción recibida, pago
    // pendiente de verificación") + PDF provisional.

    return NextResponse.json({ ok: true }, { status: 201 });
  }
}
