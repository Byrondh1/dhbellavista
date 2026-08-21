/**
 * Detección de correos mal escritos, para el alta presencial.
 *
 * En el mostrador el correo se dicta de viva voz y se teclea con prisa: es
 * donde más se cuela un "gmail.con". Y ahí el error cuesta caro, porque el
 * corredor se va sin recibir nada y nadie se entera hasta que reclama.
 *
 * Esto NO bloquea: sugiere. Hay dominios legítimos raros, y un falso positivo
 * que impida inscribir a alguien el día del evento sería peor que el error
 * que intenta evitar.
 */

/** Dominios reales contra los que se compara */
const DOMINIOS_CONOCIDOS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "outlook.es",
  "yahoo.com",
  "yahoo.es",
  "icloud.com",
  "live.com",
  "protonmail.com",
  "hotmail.es",
  "ebcorp.dev",
];

/**
 * Errores que la distancia de edición NO atrapa bien porque el resultado
 * también parece un dominio válido: ".co" y ".con" están a un solo carácter
 * de ".com", pero ".co" es el TLD real de Colombia. Aquí mandan estos.
 */
const TYPOS_EXPLICITOS: Record<string, string> = {
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmail.om": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmail.om": "hotmail.com",
  "homail.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outlook.con": "outlook.com",
  "outlook.co": "outlook.com",
  "yahou.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "icloud.con": "icloud.com",
  "iclod.com": "icloud.com",
  "live.con": "live.com",
};

/** Distancia de Levenshtein, para los errores de tecleo no catalogados */
function distancia(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let anterior = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = fila[j];
      fila[j] = Math.min(
        fila[j] + 1, // borrado
        fila[j - 1] + 1, // inserción
        anterior + (a[i - 1] === b[j - 1] ? 0 : 1), // sustitución
      );
      anterior = temp;
    }
  }
  return fila[b.length];
}

/**
 * Formato válido: algo@algo.algo, sin espacios y con punto en el dominio.
 * Deliberadamente permisiva — no es tarea de una expresión regular decidir
 * qué correos existen. Lo estricto lo hace zod en el servidor.
 */
export function formatoValido(email: string): boolean {
  const v = email.trim();
  if (v !== email.trim() || /\s/.test(v)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

/**
 * Terminaciones que son un error de ".com" y nada más. Se aplican solo como
 * segundo intento: primero se mira el dominio tal cual, así que un ".co"
 * colombiano legítimo (4loffroad.com.co y compañía) no se toca a menos que
 * cambiarlo produzca un dominio conocido.
 */
const TLD_TYPOS: Record<string, string> = {
  con: "com",
  cm: "com",
  om: "com",
  ocm: "com",
  cmo: "com",
  comm: "com",
  co: "com",
};

/** El dominio corregido, o null si no hay nada que sugerir para él */
function corregirDominio(dominio: string): string | null {
  // Un dominio correcto no se toca, aunque se parezca a otro
  if (DOMINIOS_CONOCIDOS.includes(dominio)) return null;

  const explicito = TYPOS_EXPLICITOS[dominio];
  if (explicito) return explicito;

  // Un solo carácter de diferencia sobre un dominio conocido: casi seguro un
  // dedazo. Dos ya empieza a producir falsos positivos con dominios propios,
  // así que no se pasa de uno.
  for (const conocido of DOMINIOS_CONOCIDOS) {
    if (distancia(dominio, conocido) === 1) return conocido;
  }

  return null;
}

/**
 * Devuelve el correo corregido si el dominio parece un error de tecleo, o
 * null si no hay nada que sugerir.
 *
 *   sugerirCorreo("ana@gmail.con")    → "ana@gmail.com"
 *   sugerirCorreo("ana@gmial.con")    → "ana@gmail.com"   (dos errores)
 *   sugerirCorreo("ana@gmail.com")    → null
 *   sugerirCorreo("ana@miempresa.ec") → null
 */
export function sugerirCorreo(email: string): string | null {
  const v = email.trim().toLowerCase();
  const arroba = v.lastIndexOf("@");
  if (arroba < 1) return null;

  const usuario = v.slice(0, arroba);
  const dominio = v.slice(arroba + 1);
  if (!dominio) return null;

  if (DOMINIOS_CONOCIDOS.includes(dominio)) return null;

  const directa = corregirDominio(dominio);
  if (directa) return `${usuario}@${directa}`;

  // Segundo intento, para el correo que trae dos errores a la vez
  // ("gmial.con"): se arregla la terminación y se vuelve a preguntar.
  //
  // Aquí NO se admite la distancia de edición, solo lo seguro: el dominio
  // conocido tal cual o un error catalogado. Encadenar dos correcciones
  // difusas produce disparates — "mail.co" (colombiano, real) pasaría a
  // "mail.com" y de ahí a "gmail.com", que es justo lo que no puede pasar.
  const punto = dominio.lastIndexOf(".");
  if (punto > 0) {
    const tldBueno = TLD_TYPOS[dominio.slice(punto + 1)];
    if (tldBueno) {
      const candidato = `${dominio.slice(0, punto)}.${tldBueno}`;
      if (DOMINIOS_CONOCIDOS.includes(candidato)) return `${usuario}@${candidato}`;
      const catalogado = TYPOS_EXPLICITOS[candidato];
      if (catalogado) return `${usuario}@${catalogado}`;
    }
  }

  return null;
}
