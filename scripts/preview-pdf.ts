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
}): EventConfig {
  return {
    name: overrides.name,
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
  name: "Downhill La Cantera 2026",
  club: "Remnant EB",
  primary: "#CC2200",
  primaryContrast: "#FFFFFF",
  venue: "Pista La Cantera",
  categorias: [{ id: "elite", name: "Élite" }],
});

const rodada = sampleEvent({
  name: "Rodada Angeleña 4x4 2026",
  club: "4L Off Road Club",
  primary: "#F2B705",
  primaryContrast: "#111111",
  venue: "Parque central de El Ángel",
  categorias: [{ id: "4x4", name: "Vehículos 4x4" }],
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
  for (const [slug, event, categoria] of [
    ["downhill", downhill, "elite"],
    ["rodada", rodada, "4x4"],
  ] as const) {
    const provisional = await renderInscripcionPdf(
      event,
      { ...inscrito, categoria },
      "provisional",
    );
    writeFileSync(join(outDir, `pdf-${slug}-provisional.pdf`), provisional);
    console.log(`✓ pdf-${slug}-provisional.pdf (${provisional.length} bytes)`);
  }

  // Vista previa de la variante definitiva (el QR llega en D2)
  const definitivo = await renderInscripcionPdf(
    downhill,
    { ...inscrito, categoria: "elite", dorsal: 7 },
    "definitivo",
  );
  writeFileSync(join(outDir, "pdf-downhill-definitivo.pdf"), definitivo);
  console.log(`✓ pdf-downhill-definitivo.pdf (${definitivo.length} bytes)`);

  // Aislamiento del correo: sin credenciales debe devolver sent:false,
  // jamás lanzar
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM_ADDRESS;
  const sinCredenciales = await sendEventEmail({
    event: downhill,
    to: "test@test.com",
    subject: "t",
    html: "<p>t</p>",
  });
  console.log("sin credenciales →", JSON.stringify(sinCredenciales));

  process.env.RESEND_API_KEY = "re_fake";
  process.env.EMAIL_FROM_ADDRESS = "inscripciones@ebcorp.dev";
  const redFallida = await sendEventEmail({
    event: downhill,
    to: "test@test.com",
    subject: "t",
    html: "<p>t</p>",
  });
  console.log("con red caída/clave inválida →", JSON.stringify(redFallida));
}

main();
