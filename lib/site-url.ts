import type { EventConfig } from "./types";

/**
 * Resuelve la URL pública del sitio, en orden de prioridad:
 * 1. NEXT_PUBLIC_SITE_URL (env del proyecto en Vercel — manda sobre todo)
 * 2. config.site.domain (dominio declarado en el config del evento)
 * 3. VERCEL_URL (URL temporal *.vercel.app, inyectada por Vercel)
 * 4. localhost (desarrollo)
 */
export function getSiteUrl(config: EventConfig): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || config.site.domain;
  if (explicit) return normalize(explicit);
  if (process.env.VERCEL_URL) return normalize(process.env.VERCEL_URL);
  return "http://localhost:3000";
}

function normalize(url: string): string {
  const withProtocol = url.startsWith("http") ? url : `https://${url}`;
  return withProtocol.replace(/\/$/, "");
}
