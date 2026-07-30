/**
 * Diagnóstico de la cadena del Correo 2 (y del Correo 1) contra el Supabase
 * REAL, imprimiendo cada etapa para localizar exactamente dónde falla.
 *
 * Uso (desde la raíz del repo, con .env.local presente):
 *
 *   npm run diagnose:downhill -- <id-de-inscripcion> [--enviar] [--marcar]
 *   npm run diagnose:rodada   -- <id-de-inscripcion> [--enviar] [--marcar]
 *
 * Sin --enviar hace todo MENOS llamar a Resend (útil para aislar PDF/QR).
 * Con --enviar manda el correo de verdad (respeta EMAIL_TEST_REDIRECT).
 *
 * No modifica datos, salvo que se pase --marcar (prueba el UPDATE del
 * timestamp para descartar que el write sea el que falla).
 */
import { createRequire } from "node:module";
import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";
import { renderInscripcionPdf } from "../lib/pdf/inscripcion-pdf";
import { signCheckinToken, verifyCheckinToken } from "../lib/qr-token";
import { asignaDorsal, identificadorDe, referenciaDe } from "../lib/identificador";
import { correoConfirmadaHtml, sendEventEmail } from "../lib/email";
import { rowParaCorreo } from "../lib/inscripcion-emails";
import { getSiteUrl } from "../lib/site-url";
import type { InscripcionRow } from "../lib/inscripciones";
import type { EventConfig } from "../lib/types";

const id = process.argv[2];
const enviar = process.argv.includes("--enviar");
const marcar = process.argv.includes("--marcar");

// Los configs de evento importan imágenes (normalmente las resuelve el
// bundler de Next). Aquí se stubean para poder cargar el config real.
const requireFromHere = createRequire(import.meta.url);
for (const ext of [".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg"]) {
  requireFromHere.extensions[ext] = (module, filename) => {
    (module as { exports: unknown }).exports = {
      __esModule: true,
      default: { src: filename, width: 100, height: 100, blurDataURL: "" },
    };
  };
}

const step = (n: string, msg: string) => console.log(`\n[${n}] ${msg}`);
const ok = (msg: string) => console.log(`   ✓ ${msg}`);
const bad = (msg: string) => console.log(`   ✖ ${msg}`);

async function main() {
  if (!id) {
    bad("Falta el id de la inscripción. Uso: … diagnose-email.ts <id> [--enviar] [--marcar]");
    process.exit(1);
  }

  step("1", "Variables de entorno");
  const envs = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
    QR_SECRET: process.env.QR_SECRET,
    EMAIL_TEST_REDIRECT: process.env.EMAIL_TEST_REDIRECT,
    NEXT_PUBLIC_EVENT: process.env.NEXT_PUBLIC_EVENT,
  };
  for (const [key, value] of Object.entries(envs)) {
    // Nunca se imprime el valor de un secreto: solo si está y su longitud
    const opcional = key === "EMAIL_TEST_REDIRECT";
    if (value) {
      const mostrar =
        key.includes("KEY") || key.includes("SECRET")
          ? `presente (${value.length} chars)`
          : value;
      ok(`${key}: ${mostrar}`);
    } else if (opcional) {
      console.log(`   – ${key}: ausente (opcional)`);
    } else {
      bad(`${key}: AUSENTE`);
    }
  }
  if (!envs.SUPABASE_URL || !envs.SUPABASE_SERVICE_ROLE_KEY) {
    bad("Sin credenciales de Supabase no se puede continuar.");
    process.exit(1);
  }
  if (!envs.NEXT_PUBLIC_EVENT) {
    bad("Falta NEXT_PUBLIC_EVENT: no se sabe qué config de evento cargar.");
    process.exit(1);
  }

  step("2", "Config del evento");
  const { default: config } = (await import(
    `../content/events/${envs.NEXT_PUBLIC_EVENT}/config`
  )) as { default: EventConfig };
  const event = config;
  ok(`${event.name} (${event.slug}) · primary ${event.theme.colors.primary}`);
  ok(`Site URL resuelta: ${getSiteUrl(event)}`);
  ok(`Reply-to: ${event.sections.contact?.email ?? "(sin correo en el config)"}`);

  step("3", "Lectura de la inscripción con service role");
  const supabase = createClient(envs.SUPABASE_URL, envs.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase
    .from("inscripciones")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    bad(`Error leyendo la fila: ${JSON.stringify(error)}`);
    process.exit(1);
  }
  if (!data) {
    bad(`No existe una inscripción con id ${id}`);
    process.exit(1);
  }
  const row = data as InscripcionRow;
  ok(`Encontrada: ${row.nombre} <${row.email}>`);
  ok(
    `estado=${row.estado} ${identificadorDe(event).label}=${referenciaDe(event, row)?.value ?? "—"} event_slug=${row.event_slug}`,
  );
  ok(
    `correo_recibida_at=${row.correo_recibida_at ?? "null"} · correo_confirmada_at=${row.correo_confirmada_at ?? "null"}`,
  );
  const columnasEsperadas = [
    "correo_recibida_at",
    "correo_confirmada_at",
    "asistio_at",
  ];
  const faltantes = columnasEsperadas.filter((c) => !(c in row));
  if (faltantes.length > 0) {
    bad(
      `La fila NO tiene estas columnas (¿falta correr la migración 0004?): ${faltantes.join(", ")}`,
    );
  } else {
    ok("Columnas de la migración 0004 presentes");
  }
  if (row.event_slug !== event.slug) {
    bad(
      `La inscripción es del evento "${row.event_slug}" pero NEXT_PUBLIC_EVENT es "${event.slug}" — el endpoint la trataría como no encontrada.`,
    );
  }

  step("4", "RPC verificar_inscripcion (solo se inspecciona la forma)");
  if (row.estado === "verificada") {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "verificar_inscripcion",
      { p_id: id, p_con_dorsal: asignaDorsal(event) },
    );
    if (rpcError) {
      bad(`La RPC falló: ${JSON.stringify(rpcError)}`);
    } else {
      const tipo = Array.isArray(rpcData) ? "array" : typeof rpcData;
      ok(`Devolvió: ${tipo}`);
      if (rpcData && typeof rpcData === "object" && !Array.isArray(rpcData)) {
        const keys = Object.keys(rpcData as object);
        ok(`Claves (${keys.length}): ${keys.join(", ")}`);
        const tieneCol = "correo_confirmada_at" in (rpcData as object);
        console.log(
          tieneCol
            ? `   ✓ Incluye correo_confirmada_at = ${(rpcData as Record<string, unknown>).correo_confirmada_at ?? "null"}`
            : "   ✖ NO incluye correo_confirmada_at → el guard del endpoint no podía decidir bien (ya corregido con re-lectura)",
        );
      } else {
        bad(
          `Forma inesperada (${tipo}): el guard basado en su forma habría fallado. La re-lectura de la fila lo cubre.`,
        );
      }
    }
  } else {
    console.log(
      `   – Estado "${row.estado}": no se llama la RPC para no mutar datos.`,
    );
  }

  step("5", "Token y QR de check-in");
  const referencia = referenciaDe(event, row);
  if (!referencia) {
    bad(`Sin ${identificadorDe(event).label.toLowerCase()}: el PDF saldría sin QR.`);
  } else if (!envs.QR_SECRET) {
    bad("Sin QR_SECRET: el PDF saldría sin QR.");
  } else {
    const token = signCheckinToken({
      id: row.id,
      slug: event.slug,
      ref: referencia.value,
    })!;
    ok(`Token firmado (${token.length} chars)`);
    ok(
      verifyCheckinToken(token)
        ? "Verificación del token OK"
        : "✖ El token no verifica (revisar QR_SECRET)",
    );
    const url = `${getSiteUrl(event)}/admin/checkin?t=${token}`;
    const qr = await QRCode.toDataURL(url, { margin: 1, width: 480 });
    ok(`QR generado (${qr.length} chars de data URL)`);
    console.log(`   URL del QR: ${url.slice(0, 80)}…`);
  }

  step("6", "Render del PDF definitivo");
  let pdf: Buffer;
  try {
    const qrDataUrl =
      referencia && envs.QR_SECRET
        ? await QRCode.toDataURL(
            `${getSiteUrl(event)}/admin/checkin?t=${signCheckinToken({
              id: row.id,
              slug: event.slug,
              ref: referencia.value,
            })}`,
            { margin: 1, width: 480 },
          )
        : undefined;
    pdf = await renderInscripcionPdf(
      event,
      rowParaCorreo(row),
      "definitivo",
      qrDataUrl,
    );
    ok(`PDF generado: ${pdf.length} bytes`);
  } catch (e) {
    bad(`Falló el render del PDF: ${e instanceof Error ? e.stack : String(e)}`);
    process.exit(1);
  }

  step("7", enviar ? "Envío real por Resend" : "Envío por Resend (OMITIDO — usa --enviar)");
  if (enviar) {
    const result = await sendEventEmail({
      event,
      to: row.email,
      subject: `¡Inscripción confirmada! — ${event.name}`,
      html: correoConfirmadaHtml(event, row.nombre, referenciaDe(event, row)),
      attachments: [{ filename: "inscripcion-definitiva.pdf", content: pdf }],
    });
    console.log(
      result.sent
        ? "   ✓ Resend aceptó el correo"
        : `   ✖ No se envió · razón: ${result.reason}`,
    );
  } else {
    console.log("   – Se omite para no gastar cuota de Resend.");
  }

  step("8", marcar ? "UPDATE de prueba del timestamp" : "UPDATE del timestamp (OMITIDO — usa --marcar)");
  if (marcar) {
    const { error: upError } = await supabase
      .from("inscripciones")
      .update({ correo_confirmada_at: new Date().toISOString() })
      .eq("id", id);
    console.log(
      upError
        ? `   ✖ El UPDATE falló: ${JSON.stringify(upError)} ← ESTA sería la causa del timestamp vacío`
        : "   ✓ UPDATE exitoso: escribir el timestamp no es el problema",
    );
  } else {
    console.log("   – Se omite para no modificar datos.");
  }

  console.log("\nDiagnóstico terminado.\n");
}

main().catch((e) => {
  bad(`Excepción no controlada: ${e instanceof Error ? e.stack : String(e)}`);
  process.exit(1);
});
