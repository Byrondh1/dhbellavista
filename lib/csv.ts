/**
 * Generación de CSV para abrir en Excel o Google Sheets.
 *
 * Dos decisiones que importan para que el archivo se abra bien en Ecuador:
 * - **Punto y coma** como separador: es el que Excel espera con la
 *   configuración regional es-EC (con coma metería todo en una columna).
 *   Google Sheets detecta el separador automáticamente.
 * - **BOM UTF-8** al inicio: sin él, Excel en Windows destroza los acentos
 *   ("Pérez" → "PÃ©rez").
 */
const SEPARADOR = ";";
const BOM = "﻿";

/** Escapa un valor: comillas dobladas y entrecomillado si hace falta */
function escapar(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor);
  if (
    texto.includes(SEPARADOR) ||
    texto.includes('"') ||
    texto.includes("\n") ||
    texto.includes("\r")
  ) {
    return `"${texto.replaceAll('"', '""')}"`;
  }
  return texto;
}

export function buildCsv(
  encabezados: string[],
  filas: unknown[][],
): string {
  const lineas = [
    encabezados.map(escapar).join(SEPARADOR),
    ...filas.map((fila) => fila.map(escapar).join(SEPARADOR)),
  ];
  // CRLF: lo que esperan Excel y la mayoría de herramientas
  return BOM + lineas.join("\r\n") + "\r\n";
}

/** Fecha legible para hoja de cálculo (ordenable y sin ambigüedad) */
export function csvFecha(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
