import type { EventConfig } from "./types";
import downhillLaCantera2026 from "@/content/events/downhill-la-cantera-2026/config";
import rodadaAngelena4x42026 from "@/content/events/rodada-angelena-4x4-2026/config";

/**
 * Registro de eventos disponibles. Para agregar un evento:
 * 1. Crear content/events/<slug>/config.ts (copiar uno existente como base)
 * 2. Importarlo y agregarlo aquí
 * 3. Crear el proyecto en Vercel con NEXT_PUBLIC_EVENT=<slug>
 */
const EVENTS: Record<string, EventConfig> = {
  [downhillLaCantera2026.slug]: downhillLaCantera2026,
  [rodadaAngelena4x42026.slug]: rodadaAngelena4x42026,
};

/**
 * Devuelve el evento activo según NEXT_PUBLIC_EVENT.
 * Se evalúa en build: el sitio generado contiene un solo evento.
 */
export function getActiveEvent(): EventConfig {
  const slug = process.env.NEXT_PUBLIC_EVENT;
  if (!slug) {
    throw new Error(
      `NEXT_PUBLIC_EVENT no está definida. Usa uno de los scripts npm ` +
        `(ej. "npm run dev:downhill") o define la variable con uno de estos slugs: ` +
        Object.keys(EVENTS).join(", "),
    );
  }
  const config = EVENTS[slug];
  if (!config) {
    throw new Error(
      `NEXT_PUBLIC_EVENT="${slug}" no coincide con ningún evento registrado. ` +
        `Slugs disponibles: ${Object.keys(EVENTS).join(", ")}`,
    );
  }
  return config;
}
