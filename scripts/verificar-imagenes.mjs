/**
 * Valida que las imágenes tengan el formato que dice su extensión.
 *
 *   node scripts/verificar-imagenes.mjs            # lo que esté en staging
 *   node scripts/verificar-imagenes.mjs <archivos> # archivos concretos
 *
 * Lo corre el hook de pre-commit (.githooks/pre-commit). Existe porque
 * renombrar un PNG a .webp no lo convierte: el sitio sigue funcionando —Next
 * reencoda al servir— pero el repositorio carga megas de más para siempre.
 *
 * Solo lee los primeros 16 bytes de cada archivo: no decodifica la imagen.
 *
 * Pariente de lib/file-signature.ts, que hace lo contrario (comprobar si un
 * buffer coincide con un MIME declarado) para los comprobantes que suben los
 * participantes. No comparten código porque este script corre en Node plano,
 * sin compilar TypeScript, y tiene que arrancar en milisegundos.
 */
import { execFileSync } from "node:child_process";
import { open } from "node:fs/promises";
import { extname } from "node:path";

/** Extensión → formato que debe tener el contenido */
const ESPERADO = {
  ".png": "PNG",
  ".jpg": "JPEG",
  ".jpeg": "JPEG",
  ".webp": "WebP",
};

const BYTES_A_LEER = 16;

const empiezaCon = (buf, bytes) =>
  bytes.every((byte, i) => buf[i] === byte);

const textoEn = (buf, desde, texto) =>
  [...texto].every((char, i) => buf[desde + i] === char.charCodeAt(0));

/**
 * Qué formato es de verdad, según los primeros bytes. Reconoce más formatos
 * de los que aceptamos: nombrar el real ("es un HEIC del iPhone") es lo que
 * hace útil el mensaje de error.
 */
function detectar(buf) {
  if (buf.length < 4) return null;
  if (empiezaCon(buf, [0x89, 0x50, 0x4e, 0x47])) return "PNG";
  if (empiezaCon(buf, [0xff, 0xd8, 0xff])) return "JPEG";
  if (textoEn(buf, 0, "RIFF") && textoEn(buf, 8, "WEBP")) return "WebP";
  if (textoEn(buf, 0, "GIF8")) return "GIF";
  if (textoEn(buf, 0, "BM")) return "BMP";
  if (empiezaCon(buf, [0x49, 0x49, 0x2a, 0x00])) return "TIFF";
  if (empiezaCon(buf, [0x4d, 0x4d, 0x00, 0x2a])) return "TIFF";
  if (textoEn(buf, 0, "%PDF")) return "PDF";
  // Contenedores ISO-BMFF: la marca "ftyp" va en el byte 4 y la variante
  // (heic, avif…) justo después
  if (textoEn(buf, 4, "ftyp")) {
    const marca = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]);
    if (marca.startsWith("avi")) return "AVIF";
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(marca)) {
      return "HEIC";
    }
    return `contenedor ISO (${marca})`;
  }
  if (textoEn(buf, 0, "<svg") || textoEn(buf, 0, "<?xml")) return "SVG";
  return null;
}

/** Archivos en staging que se van a commitear (sin los borrados) */
function enStaging() {
  const salida = execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
    { encoding: "buffer" },
  );
  return salida
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

async function primerosBytes(ruta) {
  // Se lee del disco, no del índice: la diferencia solo importa si se
  // preparó una versión y luego se modificó el archivo, que no es el caso
  // que este hook busca atrapar.
  const fd = await open(ruta, "r");
  try {
    const buf = Buffer.alloc(BYTES_A_LEER);
    const { bytesRead } = await fd.read(buf, 0, BYTES_A_LEER, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fd.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const archivos = (args.length > 0 ? args : enStaging()).filter(
    (archivo) => extname(archivo).toLowerCase() in ESPERADO,
  );

  const problemas = [];
  for (const archivo of archivos) {
    const esperado = ESPERADO[extname(archivo).toLowerCase()];
    let real;
    try {
      real = detectar(await primerosBytes(archivo));
    } catch {
      // El archivo no está en el disco (por ejemplo, preparado y luego
      // borrado). No es asunto de esta validación.
      continue;
    }
    if (real !== esperado) problemas.push({ archivo, esperado, real });
  }

  if (problemas.length === 0) process.exit(0);

  console.error("\n✖ Imágenes con la extensión equivocada:\n");
  for (const { archivo, esperado, real } of problemas) {
    console.error(`  ${archivo}`);
    console.error(
      `     dice ${extname(archivo)} pero el contenido es ${real ?? "de un formato desconocido"}` +
        (real ? ` (se esperaba ${esperado})` : ""),
    );
  }
  console.error(
    "\n  Renombrar la extensión NO convierte el formato. Corrígelo con:\n" +
      "     npm run fotos\n" +
      "  y vuelve a hacer commit.\n" +
      "\n  (Para saltarte esta validación: git commit --no-verify)\n",
  );
  process.exit(1);
}

main();
