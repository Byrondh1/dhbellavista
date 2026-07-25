/**
 * Logging del módulo de inscripciones. Prefijo común para poder filtrar
 * (`grep "\[inscripciones\]"`) tanto en local como en los logs de Vercel.
 * Los correos y sus fallos SIEMPRE dejan rastro: nada silencioso.
 */
const PREFIX = "[inscripciones]";

export function logInfo(message: string, extra?: unknown) {
  if (extra === undefined) console.log(`${PREFIX} ${message}`);
  else console.log(`${PREFIX} ${message}`, extra);
}

export function logWarn(message: string, extra?: unknown) {
  if (extra === undefined) console.warn(`${PREFIX} ⚠ ${message}`);
  else console.warn(`${PREFIX} ⚠ ${message}`, extra);
}

export function logError(message: string, extra?: unknown) {
  if (extra === undefined) console.error(`${PREFIX} ✖ ${message}`);
  else console.error(`${PREFIX} ✖ ${message}`, extra);
}

/** Resumen legible de un error desconocido, para logs y respuestas de API */
export function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
