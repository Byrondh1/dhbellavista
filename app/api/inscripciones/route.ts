import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveEvent } from "@/lib/event";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import {
  enviarAvisoOrganizador,
  enviarCorreoRecibida,
} from "@/lib/inscripcion-emails";
import { describeError, logError, logInfo, logWarn } from "@/lib/logger";
import { matchesSignature } from "@/lib/file-signature";
import {
  buildRegistrationSchema,
  COMPROBANTE_MAX_BYTES,
  COMPROBANTE_TYPES,
  DEFAULT_CONSENT_TEXT,
} from "@/lib/registration-schema";

/** Máximo de inscripciones por IP por hora (anti-abuso) */
const RATE_LIMIT_PER_HOUR = 5;

/** sha256(ip + salt): permite limitar por IP sin guardar la IP en claro */
function hashClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  if (!ip) return null;
  return createHash("sha256")
    .update(`${ip}${process.env.IP_HASH_SALT ?? ""}`)
    .digest("hex");
}

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
  // Candado de código: gana siempre, y no necesita la base para funcionar
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

  // Interruptor del panel (tabla evento_datos_pago): la palabra final sobre
  // si se aceptan inscripciones, para que cerrarlas no dependa del cliente.
  // Ante un error de lectura se deja pasar: el insert de más abajo fallaría
  // igual si la base no responde, y si falta la migración 0007 el módulo debe
  // seguir funcionando como antes (abiertas).
  const { data: config, error: configError } = await supabase
    .from("evento_datos_pago")
    .select("inscripciones_cerradas")
    .eq("event_slug", event.slug)
    .maybeSingle();
  if (configError) {
    logWarn(
      `No se pudo leer el estado de inscripciones de ${event.slug}: ${describeError(configError)}`,
    );
  } else if (config?.inscripciones_cerradas) {
    logInfo(`Inscripción rechazada: ${event.slug} tiene las inscripciones cerradas.`);
    return NextResponse.json(
      { error: "Las inscripciones están cerradas." },
      { status: 403 },
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

  // Rate limit por IP (hash con salt, nunca la IP en claro). Ante un error
  // de la consulta se deja pasar: el insert posterior fallaría igual si la
  // base está caída, y un rate limit roto no debe bloquear inscripciones.
  const ipHash = hashClientIp(request);
  if (ipHash) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("inscripciones")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", oneHourAgo);
    if (!countError && (count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return NextResponse.json(
        {
          error:
            "Demasiadas inscripciones desde esta conexión. Intenta de nuevo en una hora o escríbenos por WhatsApp.",
        },
        { status: 429 },
      );
    }
  }

  const parsed = buildRegistrationSchema(event).safeParse({
    nombre: data.get("nombre") ?? undefined,
    email: data.get("email") ?? undefined,
    categoria: form.fields.categoria
      ? (data.get("categoria") ?? undefined)
      : undefined,
    placa: form.fields.placa ? (data.get("placa") ?? undefined) : undefined,
    copiloto: form.fields.copiloto
      ? (data.get("copiloto") ?? undefined)
      : undefined,
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
    consentimiento: data.get("consentimiento") ?? undefined,
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
  let fileBytes: Uint8Array | null = null;
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
    // Magic bytes: el contenido real debe corresponder al tipo declarado
    fileBytes = new Uint8Array(await file.arrayBuffer());
    if (!matchesSignature(fileBytes, file.type)) {
      return NextResponse.json(
        { error: "El archivo no parece ser una imagen o PDF válido." },
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
        categoria: input.categoria ?? null,
        ciudad: input.ciudad ?? null,
        telefono: input.telefono,
        placa: input.placa ?? null,
        copiloto: input.copiloto || null,
        emergencia_nombre: input.emergenciaNombre ?? null,
        emergencia_telefono: input.emergenciaTelefono ?? null,
        club: input.club || null,
        consentimiento_at: new Date().toISOString(),
        consentimiento_texto: form!.consentText ?? DEFAULT_CONSENT_TEXT,
        ip_hash: ipHash,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        // Dos índices únicos por evento: cédula (una inscripción por persona)
        // y placa (una por vehículo). El mensaje tiene que decir cuál chocó.
        const detalle = `${insertError.message} ${insertError.details ?? ""}`;
        return NextResponse.json(
          {
            error: detalle.includes("placa")
              ? "Ese vehículo ya está inscrito en este evento. Si crees que es un error, escríbenos por WhatsApp."
              : "Ya existe una inscripción con esa cédula para este evento.",
          },
          { status: 409 },
        );
      }
      console.error("Error insertando inscripción:", insertError);
      return NextResponse.json(
        { error: "No pudimos guardar tu inscripción. Intenta de nuevo." },
        { status: 500 },
      );
    }

    if (file && fileBytes) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${event.slug}/${row.id}.${extension}`;
      const { error: uploadError } = await sb.storage
        .from("comprobantes")
        .upload(path, fileBytes, { contentType: file.type });
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

    // Correo 1: "inscripción recibida, pago pendiente" + PDF provisional.
    // Nunca decide el destino de la inscripción: si falla se loguea, el
    // panel lo muestra como no enviado y permite reenviar.
    const { sent: emailSent, reason } = await enviarCorreoRecibida(event, {
      id: row.id,
      nombre: input.nombre,
      email: input.email,
      cedula: input.cedula ?? null,
      categoria: input.categoria ?? null,
      ciudad: input.ciudad ?? null,
      telefono: input.telefono,
      // Sin esto el PDF provisional de la rodada saldría sin su identificador
      placa: input.placa ?? null,
      copiloto: input.copiloto || null,
      club: input.club || null,
      created_at: new Date().toISOString(),
    });
    if (emailSent) {
      // El write del timestamp se comprueba: un fallo aquí dejaría el correo
      // como "no enviado" en el panel sin que nadie se enterase.
      const { error: marcaError } = await sb
        .from("inscripciones")
        .update({ correo_recibida_at: new Date().toISOString() })
        .eq("id", row.id);
      if (marcaError) {
        logError(`No se pudo marcar correo_recibida_at en ${row.id}`, marcaError);
      }
    } else {
      logWarn(`Inscripción ${row.id} guardada, pero sin Correo 1: ${reason}`);
    }

    // Aviso al club. Va después del correo del participante a propósito: si
    // el tope diario de Resend se agota, que el que llegue sea el suyo. Su
    // fallo no se refleja en la respuesta ni en la base — el participante no
    // tiene por qué enterarse de un problema del buzón de la organización.
    try {
      const aviso = await enviarAvisoOrganizador(event, {
        id: row.id,
        nombre: input.nombre,
        email: input.email,
        cedula: input.cedula ?? null,
        categoria: input.categoria ?? null,
        ciudad: input.ciudad ?? null,
        telefono: input.telefono,
        placa: input.placa ?? null,
        copiloto: input.copiloto || null,
        club: input.club || null,
        created_at: new Date().toISOString(),
      });
      if (!aviso.sent) {
        logWarn(`Sin aviso al organizador de ${row.id}: ${aviso.reason}`);
      }
    } catch (error) {
      // enviarAvisoOrganizador no lanza, pero este try es la garantía de que
      // un cambio futuro ahí dentro tampoco pueda tumbar una inscripción.
      logError(`Excepción enviando el aviso al organizador de ${row.id}`, error);
    }

    return NextResponse.json({ ok: true, emailSent }, { status: 201 });
  }
}
