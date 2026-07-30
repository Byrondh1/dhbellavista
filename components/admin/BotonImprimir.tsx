"use client";

/** Abre el diálogo de impresión del navegador */
export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded border-2 border-black px-5 py-2 text-sm font-bold uppercase tracking-wide print:hidden"
    >
      Imprimir
    </button>
  );
}
