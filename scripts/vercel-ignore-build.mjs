/**
 * Ignored Build Step para Vercel: evita redeployar un evento cuando el
 * commit solo toca contenido de OTROS eventos.
 *
 * Configurar en Vercel → Project Settings → Git → Ignored Build Step:
 *   node scripts/vercel-ignore-build.mjs
 *
 * Convención de Vercel: exit 0 = omitir build, exit 1 = construir.
 */
import { execSync } from "node:child_process";

const slug = process.env.NEXT_PUBLIC_EVENT;
if (!slug) process.exit(1); // sin slug no podemos decidir: construir

let changed;
try {
  changed = execSync("git diff --name-only HEAD^ HEAD", { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
} catch {
  process.exit(1); // sin historial (primer deploy): construir
}

// Un archivo es "de otro evento" si vive en content/events/<otro>/ o
// public/events/<otro>/. Cualquier otro cambio (componentes, lib, configs
// del propio evento…) exige rebuild.
const affectsThisSite = changed.some((file) => {
  const match = file.match(/^(?:content|public)\/events\/([^/]+)\//);
  return !match || match[1] === slug;
});

console.log(
  affectsThisSite
    ? `Cambios afectan a ${slug}: construyendo.`
    : `Commit solo toca otros eventos: omitiendo build de ${slug}.`,
);
process.exit(affectsThisSite ? 1 : 0);
