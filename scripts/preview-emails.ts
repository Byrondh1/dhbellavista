/**
 * Renderiza los cuerpos HTML de los tres correos a archivos, para revisar
 * tono y branding sin enviar nada. Útil al cambiar textos.
 *
 * Uso: npx tsx --tsconfig scripts/tsconfig.preview.json scripts/preview-emails.ts <dir>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  correoConfirmadaHtml,
  correoRechazoHtml,
  correoRecibidaHtml,
  sendEventEmail,
} from "../lib/email";
import { enviarCorreoRechazo } from "../lib/inscripcion-emails";
import type { EventConfig } from "../lib/types";

const outDir = process.argv[2] ?? ".";
mkdirSync(outDir, { recursive: true });

function sampleEvent(o: {
  name: string;
  club: string;
  primary: string;
  primaryContrast: string;
  venue: string;
  phone: string;
  /** Identificador real del evento: cambia el texto del Correo 1 */
  identificador?: { tipo: "dorsal" | "placa"; label: string };
}): EventConfig {
  return {
    slug: "evento-demo",
    name: o.name,
    registrationForm: o.identificador
      ? ({ identificador: o.identificador } as EventConfig["registrationForm"])
      : undefined,
    club: { name: o.club },
    theme: { colors: { primary: o.primary, primaryContrast: o.primaryContrast } },
    date: { displayLabel: "Septiembre 2026" },
    location: { venue: o.venue, city: "El Ángel" },
    whatsapp: { phone: o.phone, registrationMessage: "" },
    categories: [],
    sections: {},
  } as unknown as EventConfig;
}

const downhill = sampleEvent({
  name: "Downhill Bella Vista 2026",
  club: "Remnant EB",
  primary: "#CC2200",
  primaryContrast: "#FFFFFF",
  venue: "Sector Bella Vista",
  phone: "593999999999",
});

const rodada = sampleEvent({
  name: "Rodada Angeleña 4x4 2026",
  club: "4L Off Road Club",
  primary: "#F2B705",
  primaryContrast: "#111111",
  venue: "Parque central de El Ángel",
  phone: "593999999999",
  identificador: { tipo: "placa", label: "Placa del vehículo" },
});

const NOMBRE = "Juan Andrés Pérez Rosero";
const MOTIVO =
  "El comprobante está borroso y no se alcanza a leer el número de transacción. Reenvíanos una captura nítida donde se vea el monto y la fecha.";

function page(titulo: string, cuerpo: string) {
  return `<!doctype html><meta charset="utf-8"><title>${titulo}</title>
<body style="margin:0;padding:24px;background:#eee">${cuerpo}</body>`;
}

async function main() {
  const salidas: [string, string][] = [
    ["email-1-recibida.html", correoRecibidaHtml(downhill, NOMBRE)],
    ["email-1-recibida-rodada.html", correoRecibidaHtml(rodada, NOMBRE)],
    ["email-2-confirmada.html", correoConfirmadaHtml(downhill, NOMBRE, { label: "Dorsal", value: "7" })],
    [
      "email-2-confirmada-rodada.html",
      correoConfirmadaHtml(rodada, NOMBRE, {
        label: "Placa del vehículo",
        value: "PCX-1234",
      }),
    ],
    ["email-3-rechazo-downhill.html", correoRechazoHtml(downhill, NOMBRE, MOTIVO)],
    ["email-3-rechazo-rodada.html", correoRechazoHtml(rodada, NOMBRE, MOTIVO)],
    ["email-3-rechazo-sin-motivo.html", correoRechazoHtml(downhill, NOMBRE, null)],
  ];
  for (const [archivo, html] of salidas) {
    writeFileSync(join(outDir, archivo), page(archivo, html));
    console.log(`✓ ${archivo}`);
  }

  // Aislamiento: sin credenciales no debe lanzar
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM_ADDRESS;
  const r = await enviarCorreoRechazo(
    downhill,
    {
      id: "demo",
      nombre: NOMBRE,
      email: "test@test.com",
      categoria: "elite",
      telefono: "0999",
      created_at: new Date().toISOString(),
    },
    MOTIVO,
  );
  console.log("rechazo sin credenciales →", JSON.stringify(r));

  process.env.RESEND_API_KEY = "re_fake";
  process.env.EMAIL_FROM_ADDRESS = "inscripciones@ebcorp.dev";
  const r2 = await sendEventEmail({
    event: downhill,
    to: "test@test.com",
    subject: "t",
    html: "<p>t</p>",
  });
  console.log("con API inalcanzable →", JSON.stringify(r2));
}

main();
