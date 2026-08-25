import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventConfig } from "./types";
import type { CorredorGrilla } from "./grilla";
import { INTERVALO_POR_DEFECTO } from "./grilla";
import { describeError, logWarn } from "./logger";

/**
 * Lecturas de la grilla contra Supabase. La aritmética vive en lib/grilla.ts,
 * que no sabe que existe una base de datos; aquí solo se va a buscar el dato.
 */

/** Fila de `evento_grilla` (migración 0011) */
export interface GrillaRow {
  event_slug: string;
  /** Cuándo se sorteó el orden. Null = todavía no se ha sorteado nunca */
  sorteada_at: string | null;
  /** "HH:MM:SS" */
  hora_inicio: string | null;
  intervalo_min: number;
  horas_calculadas_at: string | null;
  correos_enviados_at: string | null;
  updated_at: string;
  updated_by: string | null;
}

/**
 * Las columnas que la grilla necesita, y ni una más.
 *
 * Está escrito explícitamente (nada de `select("*")`) porque esta misma lista
 * alimenta la página PÚBLICA: la tabla de inscripciones guarda cédulas,
 * correos y teléfonos, y de aquí no puede salir nada de eso ni por descuido.
 */
export const COLUMNAS_GRILLA =
  "id, nombre, dorsal, categoria, salida_orden, salida_hora";

/** Los mismos campos más el correo, para el envío (nunca para la web) */
const COLUMNAS_ENVIO = `${COLUMNAS_GRILLA}, email, correo_grilla_at`;

export interface CorredorEnvio extends CorredorGrilla {
  email: string;
  correo_grilla_at: string | null;
}

/**
 * Los corredores que entran a la grilla: los verificados.
 *
 * Incluye a quien paga en efectivo el día del evento y todavía no ha pagado.
 * Es deliberado: esa persona tiene dorsal y va a correr, así que dejarla sin
 * hora de salida sería un error de grilla, no un apremio de cobro. Lo que se
 * le debe cobrar ya lo grita la pantalla de acreditación.
 */
export async function leerCorredores(
  supabase: SupabaseClient,
  eventSlug: string,
): Promise<CorredorGrilla[]> {
  const { data, error } = await supabase
    .from("inscripciones")
    .select(COLUMNAS_GRILLA)
    .eq("event_slug", eventSlug)
    .eq("estado", "verificada");
  if (error) throw error;
  return (data ?? []) as unknown as CorredorGrilla[];
}

/** Igual, más el correo: solo para el envío desde el servidor */
export async function leerCorredoresParaEnvio(
  supabase: SupabaseClient,
  eventSlug: string,
): Promise<CorredorEnvio[]> {
  const { data, error } = await supabase
    .from("inscripciones")
    .select(COLUMNAS_ENVIO)
    .eq("event_slug", eventSlug)
    .eq("estado", "verificada");
  if (error) throw error;
  return (data ?? []) as unknown as CorredorEnvio[];
}

/**
 * El orden de las categorías tal como lo dejó el organizador.
 *
 * Si la tabla todavía no tiene nada para este evento, manda el orden del
 * config: es el "de menor a mayor" con el que arranca todo, y así la pantalla
 * funciona desde el primer día sin obligar a guardar antes de poder usarla.
 */
export async function leerOrdenCategorias(
  supabase: SupabaseClient,
  event: EventConfig,
): Promise<string[]> {
  const delConfig = event.categories.map((c) => c.id);

  const { data, error } = await supabase
    .from("evento_categorias")
    .select("categoria, posicion")
    .eq("event_slug", event.slug)
    .order("posicion", { ascending: true });

  if (error) {
    // Sin la 0011 corrida, la pantalla debe seguir mostrando algo coherente
    logWarn(
      `No se pudo leer el orden de categorías de ${event.slug}: ${describeError(error)}. ` +
        `Se usa el orden del config.`,
    );
    return delConfig;
  }
  const guardado = (data ?? []).map((r) => r.categoria as string);
  if (guardado.length === 0) return delConfig;

  // Una categoría añadida al config después de guardar el orden no puede
  // quedar fuera de la grilla: se anexa al final.
  const faltantes = delConfig.filter((id) => !guardado.includes(id));
  return [...guardado.filter((id) => delConfig.includes(id)), ...faltantes];
}

/** Estado de la grilla del evento, o los valores por defecto si no hay fila */
export async function leerEstadoGrilla(
  supabase: SupabaseClient,
  eventSlug: string,
): Promise<GrillaRow | null> {
  const { data, error } = await supabase
    .from("evento_grilla")
    .select("*")
    .eq("event_slug", eventSlug)
    .maybeSingle();
  if (error) {
    logWarn(
      `No se pudo leer el estado de la grilla de ${eventSlug}: ${describeError(error)}`,
    );
    return null;
  }
  return (data as GrillaRow | null) ?? null;
}

export const INTERVALO_DEFECTO = INTERVALO_POR_DEFECTO;
