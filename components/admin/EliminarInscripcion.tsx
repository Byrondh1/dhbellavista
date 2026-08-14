"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Borrado definitivo de una inscripción, desde el panel.
 *
 * Va plegado y al final de la ficha, lejos de los botones del día a día: en el
 * celular un toque de más es fácil, y esto no se deshace.
 *
 * Para habilitarlo hay que escribir el identificador (dorsal o placa). Son
 * pocos caracteres —más rápido que teclear "BORRAR"— y obliga a mirar a QUIÉN
 * se está borrando, que es el error que de verdad se quiere evitar.
 */
export function EliminarInscripcion({
  id,
  nombre,
  estado,
  /** Dorsal o placa; null en una pendiente que aún no tiene ninguno */
  referencia,
  identLabel,
  asistio,
  tieneComprobante,
}: {
  id: string;
  nombre: string;
  estado: string;
  referencia: string | null;
  identLabel: string;
  asistio: boolean;
  tieneComprobante: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [escrito, setEscrito] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sin identificador no hay nada corto que copiar: se pide la palabra
  const esperado = referencia ?? "BORRAR";
  const etiqueta = referencia
    ? `Escribe ${identLabel.toLowerCase()} (${referencia}) para confirmar`
    : "Escribe BORRAR para confirmar";
  const coincide =
    escrito.trim().toLocaleUpperCase() === esperado.toLocaleUpperCase();

  if (!abierto) {
    return (
      <div className="mt-12 border-t border-border pt-6">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="text-sm font-semibold text-muted underline decoration-dotted underline-offset-4 hover:text-warning"
        >
          Eliminar inscripción…
        </button>
      </div>
    );
  }

  return (
    <div className="mt-12 rounded-brand border-2 border-warning bg-surface p-5">
      <h2 className="text-lg font-bold uppercase text-warning">
        Eliminar inscripción
      </h2>
      <p className="mt-2 font-semibold">
        {nombre}
        {referencia ? ` · ${identLabel} ${referencia}` : ""} · {estado}
      </p>

      <p className="mt-4 text-sm text-muted">Esto no se puede deshacer:</p>
      <ul className="mt-2 space-y-1 text-sm text-muted">
        <li>· Se borra la inscripción y todos sus datos.</li>
        {tieneComprobante && <li>· Se borra su comprobante de pago.</li>}
        <li>· Su código QR deja de servir en la acreditación.</li>
        {referencia && (
          <li>
            · Se libera {identLabel.toLowerCase()} <strong>{referencia}</strong>
            {/* El dorsal se numera con max+1, así que el hueco no se rellena */}
            {identLabel.toLowerCase() === "dorsal"
              ? ", pero el número no se reasigna: queda un hueco en la numeración."
              : ", y podrá volver a inscribirse con ella."}
          </li>
        )}
        <li>· Su cédula queda libre para volver a inscribirse.</li>
        {asistio && (
          <li className="font-semibold text-warning">
            · ATENCIÓN: esta persona ya hizo check-in y figura como presente.
          </li>
        )}
      </ul>

      <label
        className="mt-5 block text-xs uppercase tracking-wider text-muted"
        htmlFor={`confirmar-${id}`}
      >
        {etiqueta}
      </label>
      <input
        id={`confirmar-${id}`}
        value={escrito}
        onChange={(e) => setEscrito(e.target.value)}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        className="mt-1 w-full rounded-brand border border-border bg-background px-4 py-3 text-base uppercase tracking-wide"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!coincide || busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const res = await fetch(`/api/admin/inscripciones/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "eliminar" }),
              });
              const body = await res.json().catch(() => null);
              if (!res.ok) {
                setError(body?.error ?? "No se pudo eliminar. Intenta de nuevo.");
                return;
              }
              // La ficha ya no existe: volver a la lista
              router.push("/admin");
              router.refresh();
            } catch {
              setError("Sin conexión. Intenta de nuevo.");
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-brand bg-warning px-6 py-3 font-bold uppercase tracking-wide text-warning-contrast disabled:opacity-40"
        >
          {busy ? "Eliminando…" : "Eliminar definitivamente"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setEscrito("");
            setAbierto(false);
          }}
          className="rounded-brand border-2 border-current px-6 py-3 font-semibold uppercase tracking-wide text-foreground disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-warning">
          {error}
        </p>
      )}
    </div>
  );
}
