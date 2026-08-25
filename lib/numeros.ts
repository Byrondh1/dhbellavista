/**
 * Números escritos con letras, para los textos de los configs.
 *
 * Existe por un problema concreto: las landings dicen cosas como "Nueve
 * categorías" con el número a mano, y cuando la lista cambia el texto se
 * queda mintiendo sin que nadie se entere. Derivarlo del array obliga a
 * convertir el conteo a palabras.
 *
 * Llega hasta el veintinueve y de ahí en adelante devuelve la cifra. Es de
 * sobra para lo que se cuenta en un evento —categorías, modalidades, días— y
 * evita arrastrar una librería para escribir nueve palabras.
 */

/** Masculino: "un corredor", "veintiún corredores" */
const MASCULINO = [
  "cero", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho",
  "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis",
  "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiún", "veintidós",
  "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete",
  "veintiocho", "veintinueve",
];

/** Femenino: solo cambian el uno y el veintiuno ("una categoría") */
const FEMENINO = MASCULINO.map((palabra) =>
  palabra === "un" ? "una" : palabra === "veintiún" ? "veintiuna" : palabra,
);

export type Genero = "masculino" | "femenino";

/**
 * El número en palabras, o en cifra si se sale del rango cubierto.
 *
 *   enLetras(9)                → "nueve"
 *   enLetras(1, "femenino")    → "una"
 *   enLetras(120)              → "120"
 */
export function enLetras(n: number, genero: Genero = "masculino"): string {
  if (!Number.isInteger(n) || n < 0) return String(n);
  const palabras = genero === "femenino" ? FEMENINO : MASCULINO;
  return palabras[n] ?? String(n);
}

/** Primera letra en mayúscula, para cuando la frase abre una oración */
export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Cuenta cosas en femenino concordando el sustantivo:
 * "nueve categorías", "una categoría", "ninguna categoría".
 *
 * Devuelve en minúscula, que es como cae dentro de una frase; quien abra
 * oración con esto lo envuelve en `capitalizar`. Contar y decidir mayúsculas
 * son dos cosas distintas y el mismo texto se usa de las dos maneras.
 */
export function contarFemenino(
  n: number,
  singular: string,
  plural: string,
): string {
  if (n === 0) return `ninguna ${singular}`;
  return `${enLetras(n, "femenino")} ${n === 1 ? singular : plural}`;
}
