import type { EventConfig, Identificador } from "./types";

export type { Identificador, TipoIdentificador } from "./types";

/**
 * Cómo se identifica a cada inscrito, y de dónde sale ese dato. Único punto
 * de decisión: el PDF, los correos, el QR, el panel y la acreditación piden
 * aquí en lugar de leer `dorsal` o `placa` por su cuenta. Un evento nuevo que
 * identifique de otra forma se resuelve tocando este archivo y el config, no
 * la interfaz.
 */

/** Lo que se asume cuando un evento no lo declara: el caso del downhill */
export const IDENTIFICADOR_POR_DEFECTO: Identificador = {
  tipo: "dorsal",
  label: "Dorsal",
};

export function identificadorDe(event: EventConfig): Identificador {
  return event.registrationForm?.identificador ?? IDENTIFICADOR_POR_DEFECTO;
}

/** ¿El evento clasifica a sus inscritos? (la rodada 4x4 no) */
export function usaCategorias(event: EventConfig): boolean {
  return event.registrationForm?.fields.categoria !== false;
}

/**
 * ¿Se asigna dorsal al verificar el pago? Solo cuando el identificador es el
 * dorsal: en la rodada la placa la trae el participante desde el inicio, así
 * que verificar no numera nada.
 */
export function asignaDorsal(event: EventConfig): boolean {
  return identificadorDe(event).tipo === "dorsal";
}

/** Campos de los que puede salir el identificador (fila o datos del PDF) */
export interface DatosIdentificables {
  dorsal?: number | null;
  placa?: string | null;
}

/** El identificador ya listo para mostrar, o null si todavía no existe */
export function refDe(
  datos: DatosIdentificables,
  ident: Identificador,
): string | null {
  if (ident.tipo === "placa") return datos.placa?.trim() || null;
  return datos.dorsal != null ? String(datos.dorsal) : null;
}

/** Etiqueta + valor, como lo necesitan el PDF y los correos */
export function referenciaDe(
  event: EventConfig,
  datos: DatosIdentificables,
): { label: string; value: string } | null {
  const ident = identificadorDe(event);
  const value = refDe(datos, ident);
  return value === null ? null : { label: ident.label, value };
}
