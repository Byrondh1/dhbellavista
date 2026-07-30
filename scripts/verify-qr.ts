/**
 * Verificación de la cadena QR de check-in (sub-fase D2):
 * 1. Firma y verificación del token (round-trip + token alterado).
 * 2. QR PNG generado y decodificado de vuelta → debe dar la URL exacta.
 * 3. PDF definitivo con dorsal y QR, para revisión visual.
 *
 * Uso: QR_SECRET=... npx tsx --tsconfig scripts/tsconfig.preview.json scripts/verify-qr.ts <dir-salida>
 */
import { createHmac } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { signCheckinToken, verifyCheckinToken } from "../lib/qr-token";
import { renderInscripcionPdf } from "../lib/pdf/inscripcion-pdf";
import type { EventConfig } from "../lib/types";

const outDir = process.argv[2] ?? ".";
mkdirSync(outDir, { recursive: true });

async function main() {
  process.env.QR_SECRET ??= "secreto-de-prueba-solo-para-verificacion";

  // 1. Firma round-trip
  const payload = {
    id: "a1b2c3d4-0000-0000-0000-000000000000",
    slug: "downhill-la-cantera-2026",
    ref: "7",
  };
  const token = signCheckinToken(payload)!;
  const verified = verifyCheckinToken(token);
  console.log(
    "round-trip firma:",
    JSON.stringify(verified) === JSON.stringify(payload) ? "OK" : "FALLO",
  );

  // Token alterado (dorsal 7 → intento de cambiarlo) debe rechazarse
  const [encoded] = token.split(".");
  const tampered = Buffer.from(
    JSON.stringify({ ...payload, ref: "99" }),
  ).toString("base64url");
  console.log(
    "payload alterado con firma vieja:",
    verifyCheckinToken(`${tampered}.${token.split(".")[1]}`) === null
      ? "RECHAZADO (correcto)"
      : "ACEPTADO (¡FALLO!)",
  );
  console.log(
    "firma alterada:",
    verifyCheckinToken(`${encoded}.AAAA${token.split(".")[1].slice(4)}`) === null
      ? "RECHAZADO (correcto)"
      : "ACEPTADO (¡FALLO!)",
  );

  // 2. QR generado y decodificado de vuelta
  const url = `https://downhill.ebcorp.dev/admin/checkin?t=${token}`;
  const qrPng = await QRCode.toBuffer(url, { margin: 1, width: 480 });
  const png = PNG.sync.read(qrPng);
  const decoded = jsQR(
    new Uint8ClampedArray(png.data),
    png.width,
    png.height,
  );
  console.log("QR decodificado === URL:", decoded?.data === url ? "OK" : "FALLO");
  const tokenDelQr = new URL(decoded!.data).searchParams.get("t")!;
  console.log(
    "token extraído del QR verifica:",
    verifyCheckinToken(tokenDelQr)?.ref === "7" ? "OK" : "FALLO",
  );

  // Identificador de texto (placa): el mismo mecanismo sirve sin cambios
  const tokenPlaca = signCheckinToken({
    id: payload.id,
    slug: "rodada-angelena-4x4-2026",
    ref: "PCX-1234",
  })!;
  console.log(
    "token por placa:",
    verifyCheckinToken(tokenPlaca)?.ref === "PCX-1234" ? "OK" : "FALLO",
  );

  // Tokens viejos (dorsal numérico) firmados con el mismo secreto: los PDFs
  // ya enviados deben seguir sirviendo
  const legacyEncoded = Buffer.from(
    JSON.stringify({ id: payload.id, slug: payload.slug, dorsal: 7 }),
  ).toString("base64url");
  const legacyHmac = createHmac("sha256", process.env.QR_SECRET!)
    .update(legacyEncoded)
    .digest("base64url");
  console.log(
    "token con formato viejo (dorsal numérico):",
    verifyCheckinToken(`${legacyEncoded}.${legacyHmac}`)?.ref === "7"
      ? "ACEPTADO (correcto)"
      : "RECHAZADO (¡FALLO!)",
  );

  // 3. PDF definitivo con QR para revisión visual
  const event = {
    name: "Downhill La Cantera 2026",
    club: { name: "Remnant EB" },
    theme: { colors: { primary: "#CC2200", primaryContrast: "#FFFFFF" } },
    date: { displayLabel: "Septiembre 2026" },
    location: { venue: "Pista La Cantera", city: "El Ángel" },
    categories: [{ id: "elite", name: "Élite" }],
    sections: {},
  } as unknown as EventConfig;

  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 480 });
  const pdf = await renderInscripcionPdf(
    event,
    {
      id: payload.id,
      nombre: "Juan Andrés Pérez Rosero",
      cedula: "0401234567",
      categoria: "elite",
      ciudad: "Ibarra",
      telefono: "0991234567",
      club: "Los Cóndores MTB",
      dorsal: 7,
      created_at: new Date().toISOString(),
    },
    "definitivo",
    qrDataUrl,
  );
  writeFileSync(join(outDir, "pdf-definitivo-con-qr.pdf"), pdf);
  console.log(`✓ pdf-definitivo-con-qr.pdf (${pdf.length} bytes)`);
}

main();
