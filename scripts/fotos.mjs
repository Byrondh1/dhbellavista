/**
 * Optimiza las fotos de un evento y regenera la lista de la galería.
 *
 *   npm run fotos              # los dos eventos
 *   npm run fotos -- downhill  # solo uno (downhill | rodada | slug completo)
 *   npm run fotos -- --dry     # muestra qué haría, sin escribir nada
 *
 * Qué hace, por cada carpeta content/events/<slug>/images/:
 *
 * 1. Toma lo que haya con los nombres esperados (hero, about, gallery-N…) en
 *    cualquier formato —JPG, PNG, HEIC del iPhone, WebP— y lo convierte al
 *    archivo canónico `<nombre>.webp`, redimensionado al ancho máximo de su
 *    rol y comprimido. El original en otro formato se borra tras escribir el
 *    WebP: la carpeta queda con un solo archivo por foto.
 * 2. Regenera `galeria.ts` con las fotos gallery-N que existan de verdad, así
 *    agregar o quitar una foto no obliga a tocar el config.
 *
 * Es idempotente: volver a correrlo sobre fotos ya optimizadas no las vuelve
 * a comprimir (perderían calidad en cada pasada).
 */
import { readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join, parse } from "node:path";
import sharp from "sharp";

const RAIZ = new URL("../content/events/", import.meta.url).pathname;

/**
 * Un rol por tipo de foto. `ancho` es el ancho máximo del archivo fuente: no
 * el que se sirve. Next genera versiones más pequeñas para cada pantalla, así
 * que de más solo engorda el repo; de menos se ve borroso en escritorio.
 */
const ROLES = [
  { patron: /^hero$/, ancho: 1920, calidad: 72, presupuestoKB: 400 },
  { patron: /^about$/, ancho: 1280, calidad: 74, presupuestoKB: 250 },
  { patron: /^track-\d+$/, ancho: 1280, calidad: 74, presupuestoKB: 250 },
  { patron: /^gallery-\d+$/, ancho: 1600, calidad: 74, presupuestoKB: 300 },
  { patron: /^logo-club$/, ancho: 512, calidad: 82, presupuestoKB: 80 },
  { patron: /^sponsor-\d+$/, ancho: 512, calidad: 82, presupuestoKB: 80 },
  { patron: /^texture-tread$/, ancho: 1024, calidad: 80, presupuestoKB: 150 },
];

const ENTRADAS = [".webp", ".jpg", ".jpeg", ".png", ".heic", ".heif", ".tif", ".tiff"];

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const filtro = args.find((a) => !a.startsWith("--"));

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

async function eventos() {
  const todos = (await readdir(RAIZ, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  if (!filtro) return todos;
  const encontrados = todos.filter((slug) => slug.includes(filtro));
  if (encontrados.length === 0) {
    console.error(`✖ Ningún evento coincide con "${filtro}". Hay: ${todos.join(", ")}`);
    process.exit(1);
  }
  return encontrados;
}

function rolDe(nombre) {
  return ROLES.find((r) => r.patron.test(nombre));
}

/** Agrupa los archivos por nombre base, para elegir una sola fuente por foto */
async function candidatos(dir) {
  const archivos = await readdir(dir);
  const porNombre = new Map();
  const desconocidos = [];

  for (const archivo of archivos) {
    const { name, ext } = parse(archivo);
    if (!ENTRADAS.includes(ext.toLowerCase())) continue;
    if (!rolDe(name)) {
      desconocidos.push(archivo);
      continue;
    }
    const lista = porNombre.get(name) ?? [];
    lista.push(archivo);
    porNombre.set(name, lista);
  }
  return { porNombre, desconocidos };
}

async function optimizar(dir, nombre, archivos) {
  const rol = rolDe(nombre);
  const destino = join(dir, `${nombre}.webp`);

  // Si dejó una foto nueva junto al WebP viejo, la nueva manda
  const original = archivos.find((a) => !a.toLowerCase().endsWith(".webp"));
  const fuente = join(dir, original ?? `${nombre}.webp`);

  const antes = (await stat(fuente)).size;
  const meta = await sharp(fuente).metadata();

  // Ya está lista: WebP y dentro del ancho del rol. Recomprimir un WebP en
  // cada corrida lo degrada sin ganar nada, así que el presupuesto de peso NO
  // entra aquí: una foto muy detallada puede no bajar de él por más vueltas
  // que se le dé, y volver a codificarla solo le quita calidad. Se avisa y se
  // deja quieta; si de verdad estorba, se recorta o se cambia la foto.
  // `meta.format` y no la extensión: un PNG renombrado a .webp se ve idéntico
  // en el explorador de archivos y pesa cinco veces más. Es el error que más
  // se repite al subir fotos desde el celular o por la web de GitHub.
  if (!original && meta.format === "webp" && (meta.width ?? 0) <= rol.ancho) {
    const gorda = antes > rol.presupuestoKB * 1024;
    console.log(
      `   · ${nombre}.webp ya optimizada (${meta.width}px, ${kb(antes)})` +
        (gorda ? `  ⚠ sobre el presupuesto de ${rol.presupuestoKB} KB` : ""),
    );
    return { saltada: true };
  }

  if (dry) {
    console.log(
      `   → ${original ?? `${nombre}.webp`} (${meta.width}×${meta.height}, ${kb(antes)}) → ${nombre}.webp @${rol.ancho}px`,
    );
    return { dry: true };
  }

  // A un temporal: sharp no puede leer y escribir el mismo archivo
  const temporal = join(dir, `.${nombre}.tmp.webp`);
  await sharp(fuente)
    .rotate() // respeta la orientación EXIF del celular
    .resize({ width: rol.ancho, withoutEnlargement: true })
    .webp({ quality: rol.calidad, effort: 5 })
    .toFile(temporal);
  await rename(temporal, destino);

  // El original en otro formato ya no hace falta: sobra peso en el repo y
  // confunde sobre cuál es el archivo bueno.
  if (original && original.toLowerCase() !== `${nombre}.webp`) {
    await rm(join(dir, original));
  }

  const despues = (await stat(destino)).size;
  const aviso = despues > rol.presupuestoKB * 1024 ? "  ⚠ sigue pesada" : "";
  console.log(
    `   ✓ ${nombre}.webp — ${kb(antes)} → ${kb(despues)} (${Math.round((1 - despues / antes) * 100)}% menos)${aviso}`,
  );
  return { antes, despues };
}

/** Reescribe galeria.ts con las fotos que existen ahora mismo */
async function regenerarGaleria(dir, slug) {
  const archivos = (await readdir(dir))
    .filter((a) => /^gallery-\d+\.webp$/.test(a))
    .sort(
      (a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]),
    );

  // Textos alternativos: los edita quien quiera afinar accesibilidad y SEO
  const rutaAlts = join(dir, "galeria-alt.json");
  let alts = {};
  try {
    alts = JSON.parse(await readFile(rutaAlts, "utf8"));
  } catch {
    // Sin archivo de alts: se usan los genéricos
  }

  const imports = archivos
    .map((a, i) => `import foto${i + 1} from "./${a}";`)
    .join("\n");
  const entradas = archivos
    .map((a, i) => {
      const alt = alts[a] ?? `Foto ${i + 1} de la galería`;
      return `  { src: foto${i + 1}, alt: ${JSON.stringify(alt)} },`;
    })
    .join("\n");

  const contenido = `// GENERADO por scripts/fotos.mjs — no editar a mano.
// Para agregar una foto: deja gallery-<n>.jpg en esta carpeta y corre
// \`npm run fotos\`. Los textos alternativos se editan en galeria-alt.json.
import type { ImageAsset } from "@/lib/types";
${imports ? "\n" + imports + "\n" : ""}
/** Fotos de la galería de ${slug}, en orden */
export const galeria: ImageAsset[] = [
${entradas}
];

export default galeria;
`;

  if (dry) {
    console.log(`   → galeria.ts tendría ${archivos.length} fotos`);
    return archivos.length;
  }
  await writeFile(join(dir, "galeria.ts"), contenido);
  console.log(`   ✓ galeria.ts con ${archivos.length} foto(s)`);
  return archivos.length;
}

async function main() {
  for (const slug of await eventos()) {
    const dir = join(RAIZ, slug, "images");
    console.log(`\n▸ ${slug}`);

    const { porNombre, desconocidos } = await candidatos(dir);
    for (const [nombre, archivos] of [...porNombre].sort()) {
      await optimizar(dir, nombre, archivos);
    }
    await regenerarGaleria(dir, slug);

    if (desconocidos.length > 0) {
      console.log(
        `   ⚠ Sin usar (nombre no reconocido): ${desconocidos.join(", ")}\n` +
          `     Renómbralos según content/events/${slug}/images/README.md`,
      );
    }
  }
  if (dry) console.log("\n(--dry: no se escribió nada)");
}

main();
