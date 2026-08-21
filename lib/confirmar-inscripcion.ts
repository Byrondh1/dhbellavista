import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventConfig } from "./types";
import { asignaDorsal } from "./identificador";

/**
 * Confirmar una inscripción y asignarle su número.
 *
 * Único punto de entrada al sorteo: lo llaman la confirmación de un pago
 * online (panel) y el alta presencial del día del evento. La lógica de verdad
 * vive dentro de `verificar_inscripcion` (migración 0010), donde el lock y el
 * sorteo ocurren en la misma transacción; aquí solo se decide con qué
 * parámetros se la llama, y eso también se decide en un solo sitio.
 */

/** Cupo duro del evento, o null si numera secuencialmente por categoría */
export function cupoDorsales(event: EventConfig): number | null {
  return event.registrationForm?.cupoDorsales ?? null;
}

export type Confirmacion =
  | { ok: true }
  /** cupoLleno = no quedan números libres; cualquier otro fallo es técnico */
  | { ok: false; cupoLleno: boolean; error: unknown };

/**
 * La RPC señala el cupo agotado con un raise propio para poder distinguirlo
 * de un error de base: al de la puerta hay que decirle "no quedan dorsales",
 * no un mensaje genérico de "intenta de nuevo" que le haría reintentar en
 * vano.
 */
function esCupoLleno(error: unknown): boolean {
  const mensaje =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
  return mensaje.includes("CUPO_LLENO");
}

export async function confirmarInscripcion(
  supabase: SupabaseClient,
  event: EventConfig,
  id: string,
): Promise<Confirmacion> {
  // p_con_dorsal explícito: en los eventos identificados por placa confirmar
  // no numera nada (migración 0008). p_cupo tiene default en la función, así
  // que pasarlo null equivale a no pasarlo: secuencial por categoría.
  const { error } = await supabase.rpc("verificar_inscripcion", {
    p_id: id,
    p_con_dorsal: asignaDorsal(event),
    p_cupo: cupoDorsales(event),
  });
  if (!error) return { ok: true };
  return { ok: false, cupoLleno: esCupoLleno(error), error };
}
