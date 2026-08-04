/**
 * Genera PDFs de muestra de ambos eventos para revisión visual, y prueba
 * que el helper de correo falla con gracia (nunca lanza) sin credenciales.
 *
 * Uso: npx tsx --tsconfig scripts/tsconfig.preview.json scripts/preview-pdf.ts <dir-salida>
 *
 * Nota: no importa los configs reales porque incluyen imports de imágenes
 * (los resuelve el bundler de Next, no tsx); estos objetos replican los
 * campos que el PDF consume.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderInscripcionPdf } from "../lib/pdf/inscripcion-pdf";
import { sendEventEmail } from "../lib/email";
import type { EventConfig } from "../lib/types";

const outDir = process.argv[2] ?? ".";
mkdirSync(outDir, { recursive: true });

function sampleEvent(overrides: {
  name: string;
  club: string;
  primary: string;
  primaryContrast: string;
  venue: string;
  categorias: { id: string; name: string }[];
  /** Refleja el registrationForm real del evento (identificador y campos) */
  form: EventConfig["registrationForm"];
}): EventConfig {
  return {
    name: overrides.name,
    registrationForm: overrides.form,
    club: { name: overrides.club },
    theme: {
      colors: {
        primary: overrides.primary,
        primaryContrast: overrides.primaryContrast,
      },
    },
    date: { displayLabel: "Septiembre 2026" },
    location: { venue: overrides.venue, city: "El Ángel" },
    categories: overrides.categorias,
    sections: {},
  } as unknown as EventConfig;
}

const downhill = sampleEvent({
  name: "Downhill Bella Vista 2026",
  club: "Remnant EB",
  primary: "#CC2200",
  primaryContrast: "#FFFFFF",
  venue: "Sector Bella Vista",
  categorias: [{ id: "elite", name: "Élite" }],
  form: {
    fields: {
      cedula: true,
      ciudad: true,
      emergencyContact: true,
      clubTeam: true,
      categoria: true,
      placa: false,
      copiloto: false,
    },
    identificador: { tipo: "dorsal", label: "Dorsal" },
    comprobante: true,
  },
});

const rodada = sampleEvent({
  name: "Rodada Angeleña 4x4 2026",
  club: "4L Off Road Club",
  primary: "#F2B705",
  primaryContrast: "#111111",
  venue: "Parque central de El Ángel",
  categorias: [{ id: "4x4", name: "Vehículos 4x4" }],
  form: {
    fields: {
      cedula: true,
      ciudad: true,
      emergencyContact: true,
      clubTeam: true,
      categoria: false,
      placa: true,
      copiloto: true,
    },
    identificador: { tipo: "placa", label: "Placa del vehículo" },
    comprobante: true,
  },
});

const inscrito = {
  id: "a1b2c3d4-0000-0000-0000-000000000000",
  nombre: "Juan Andrés Pérez Rosero",
  cedula: "0401234567",
  ciudad: "Ibarra",
  telefono: "0991234567",
  club: "Los Cóndores MTB",
  created_at: new Date().toISOString(),
};

async function main() {
  // Cada evento con SUS datos: el downhill se identifica por dorsal y
  // clasifica; la rodada por placa, sin categoría y con copiloto.
  for (const [slug, event, datos] of [
    ["downhill", downhill, { categoria: "elite", dorsal: 7 }],
    [
      "rodada",
      rodada,
      { placa: "PCX-1234", copiloto: "Andrés Pozo Villarreal" },
    ],
  ] as const) {
    for (const variant of ["provisional", "definitivo"] as const) {
      const pdf = await renderInscripcionPdf(
        event,
        { ...inscrito, ...datos },
        variant,
      );
      writeFileSync(join(outDir, `pdf-${slug}-${variant}.pdf`), pdf);
      console.log(`✓ pdf-${slug}-${variant}.pdf (${pdf.length} bytes)`);
    }
  }

  // Aislamiento del correo: sin RESEND_API_KEY debe devolver sent:false,
  // jamás lanzar
  delete process.env.RESEND_API_KEY;
  const sinCredenciales = await sendEventEmail({
    event: downhill,
    to: "test@test.com",
    subject: "t",
    html: "<p>t</p>",
  });
  console.log("sin credenciales →", JSON.stringify(sinCredenciales));

  process.env.RESEND_API_KEY = "re_fake";
  const redFallida = await sendEventEmail({
    event: downhill,
    to: "test@test.com",
    subject: "t",
    html: "<p>t</p>",
  });
  console.log("con red caída/clave inválida →", JSON.stringify(redFallida));
}

main();
