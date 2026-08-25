import type { EventConfig } from "./types";

/**
 * Grilla de salida: el orden en que baja cada corredor y a qué minuto.
 *
 * Tres cosas que este archivo mantiene separadas a propósito, porque
 * mezclarlas es lo que rompe una grilla el día del evento:
 *
 *   · El ORDEN dentro de cada categoría se SORTEA una sola vez.
 *   · Las HORAS son pura aritmética sobre ese orden: recalcularlas no
 *     re-sortea nada, así que cambiar la hora de inicio a las 11 de la noche
 *     anterior es una operación segura.
 *   · Una AUSENCIA no mueve a nadie. El minuto del que no se presentó queda
 *     vacío y el resto conserva la hora que ya le comunicaron.
 *
 * Todo lo de aquí es puro: sin base de datos y sin fechas del sistema, para
 * poder comprobarlo con lápiz y papel.
 */

/** Un corredor dentro de la grilla, con lo mínimo para ordenarlo y pintarlo */
export interface CorredorGrilla {
  id: string;
  nombre: string;
  dorsal: number | null;
  categoria: string | null;
  /** Turno dentro de su categoría (1, 2, 3…). Null = todavía sin sortear */
  salida_orden: number | null;
  /** "HH:MM" o "HH:MM:SS" como lo devuelve Postgres. Null = sin calcular */
  salida_hora: string | null;
}

/** Una categoría con sus corredores ya ordenados por turno */
export interface GrupoGrilla {
  /** Id de la categoría en el config; null en el grupo "sin categoría" */
  categoria: string | null;
  /** Nombre visible */
  nombre: string;
  corredores: CorredorGrilla[];
}

/** Parámetros con los que se calcularon las horas */
export interface ParametrosGrilla {
  /** "HH:MM" */
  horaInicio: string;
  /** Minutos entre un corredor y el siguiente, dentro de la misma categoría */
  intervaloMin: number;
}

export const INTERVALO_POR_DEFECTO = 1;

/**
 * Mezcla de Fisher-Yates. Devuelve un array nuevo: la entrada no se toca.
 *
 * `Math.random` alcanza de sobra — esto reparte turnos de salida en una
 * carrera de pueblo, no reparte cartas por dinero.
 */
export function sortear<T>(items: readonly T[]): T[] {
  const copia = [...items];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** "12:00" o "12:00:00" → minutos desde medianoche. Null si no es una hora */
export function horaAMinutos(hora: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(hora.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Minutos desde medianoche → "HH:MM". Pasadas las 24 h sigue contando */
export function minutosAHora(minutos: number): string {
  const h = Math.floor(minutos / 60) % 24;
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Solo la hora y el minuto, para pintar lo que devuelve Postgres */
export function horaVisible(hora: string | null): string {
  if (!hora) return "—";
  const m = /^(\d{1,2}):(\d{2})/.exec(hora.trim());
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : hora;
}

/**
 * Reparte las horas de salida sobre una grilla ya ordenada.
 *
 * Dentro de una categoría, cada corredor sale un `intervaloMin` después del
 * anterior. Al cambiar de categoría se deja **un intervalo libre extra**, para
 * que el equipo de meta y el de partida respiren entre tandas:
 *
 *   inicio 12:00, intervalo 1, Infantil con 3 → 12:00, 12:01, 12:02
 *   el 12:03 queda vacío
 *   la primera Dama sale 12:04
 *
 * Devuelve un mapa id → "HH:MM". Los grupos vacíos no consumen hueco: una
 * categoría sin inscritos no debe abrir un agujero en la mañana.
 */
export function calcularHoras(
  grupos: readonly GrupoGrilla[],
  { horaInicio, intervaloMin }: ParametrosGrilla,
): Map<string, string> {
  const horas = new Map<string, string>();
  const inicio = horaAMinutos(horaInicio);
  if (inicio === null || intervaloMin < 1) return horas;

  let minuto = inicio;
  let primeraCategoria = true;

  for (const grupo of grupos) {
    if (grupo.corredores.length === 0) continue;
    // El hueco va ENTRE categorías, así que no se paga antes de la primera
    if (!primeraCategoria) minuto += intervaloMin * 2;
    primeraCategoria = false;

    grupo.corredores.forEach((corredor, i) => {
      if (i > 0) minuto += intervaloMin;
      horas.set(corredor.id, minutosAHora(minuto));
    });
  }

  return horas;
}

/**
 * Agrupa a los corredores por categoría siguiendo el orden dado, y dentro de
 * cada una por su turno de salida.
 *
 * `ordenCategorias` manda: es el orden que el organizador fijó en el panel.
 * Una categoría con corredores que no esté en esa lista se va al final en vez
 * de desaparecer — perder gente de la grilla por un id que no cuadra sería
 * mucho peor que mostrarla fuera de sitio.
 */
export function agruparEnGrilla(
  corredores: readonly CorredorGrilla[],
  ordenCategorias: readonly string[],
  nombreDeCategoria: (id: string | null) => string,
): GrupoGrilla[] {
  const porCategoria = new Map<string | null, CorredorGrilla[]>();
  for (const corredor of corredores) {
    const clave = corredor.categoria ?? null;
    const lista = porCategoria.get(clave);
    if (lista) lista.push(corredor);
    else porCategoria.set(clave, [corredor]);
  }

  const posicion = new Map(ordenCategorias.map((id, i) => [id, i]));
  const claves = [...porCategoria.keys()].sort((a, b) => {
    const pa = a === null ? Infinity : (posicion.get(a) ?? Infinity);
    const pb = b === null ? Infinity : (posicion.get(b) ?? Infinity);
    if (pa !== pb) return pa - pb;
    // Desempate estable para las que no están en el orden configurado
    return String(a).localeCompare(String(b));
  });

  return claves.map((categoria) => ({
    categoria,
    nombre: nombreDeCategoria(categoria),
    corredores: [...(porCategoria.get(categoria) ?? [])].sort(
      (a, b) =>
        // Sin sortear todavía, el turno es null: van al final, por dorsal
        (a.salida_orden ?? Infinity) - (b.salida_orden ?? Infinity) ||
        (a.dorsal ?? 0) - (b.dorsal ?? 0),
    ),
  }));
}

/**
 * "12:00 a 12:02", o solo "12:07" cuando la categoría tiene un único
 * corredor: un rango que empieza y termina a la misma hora se lee como un
 * error de la página.
 */
export function franjaHoraria(corredores: readonly CorredorGrilla[]): string {
  const primera = horaVisible(corredores[0]?.salida_hora ?? null);
  const ultima = horaVisible(corredores.at(-1)?.salida_hora ?? null);
  return primera === ultima ? primera : `${primera} a ${ultima}`;
}

/**
 * ¿Este evento usa grilla de salida?
 *
 * Se declara en el config y no se deduce del slug: la rodada 4x4 no clasifica
 * ni baja de a uno, así que la pantalla no existe para ella.
 */
export function usaGrilla(event: EventConfig): boolean {
  return event.registrationForm?.grillaSalida === true;
}
