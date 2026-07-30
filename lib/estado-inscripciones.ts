import { z } from "zod";
import type { DatosPagoRow } from "./datos-pago";

/**
 * Estado de las inscripciones de un evento: abiertas o cerradas. Se guarda en
 * la base (tabla evento_datos_pago, migración 0007) y se edita desde
 * /admin/configuracion, para poder cerrar sin redesplegar.
 *
 * El config del evento conserva `registrationForm.closed` como override de
 * código: si está en true, las inscripciones están cerradas pase lo que pase
 * con la base. Nunca puede abrir lo que el panel cerró — la combinación es
 * "cerrado si cualquiera de los dos lo dice", así que no hay forma de
 * quedarse abierto por error.
 */
export interface EstadoInscripciones {
  cerradas: boolean;
  /** Cuándo se cerraron (informativo para el panel) */
  cerradasAt: string | null;
  /** Mensaje para el público; null = MENSAJE_CIERRE_POR_DEFECTO */
  mensaje: string | null;
}

export const MENSAJE_CIERRE_POR_DEFECTO =
  "Las inscripciones están cerradas. Gracias por el interés — nos vemos en la próxima edición.";

/**
 * Si la fila no existe, o existe sin las columnas de la 0007 (migración no
 * ejecutada todavía), las inscripciones se consideran ABIERTAS: es el
 * comportamiento que tenía el módulo antes de este cambio.
 */
export function rowToEstadoInscripciones(
  row: DatosPagoRow | null,
): EstadoInscripciones {
  return {
    cerradas: row?.inscripciones_cerradas === true,
    cerradasAt: row?.inscripciones_cerradas_at ?? null,
    mensaje: row?.mensaje_cierre ?? null,
  };
}

/** Validación del interruptor del panel, compartida cliente/servidor */
export const estadoInscripcionesSchema = z.object({
  cerradas: z.boolean(),
  mensaje: z
    .string()
    .trim()
    .max(300, "El mensaje no puede pasar de 300 caracteres")
    .optional()
    .or(z.literal("")),
});

export type EstadoInscripcionesInput = z.infer<typeof estadoInscripcionesSchema>;
