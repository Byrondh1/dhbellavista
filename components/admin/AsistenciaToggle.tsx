"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Marca o desmarca la asistencia de un inscrito desde la lista de
 * acreditación. Optimizado para el dedo: el botón es el área táctil grande
 * de cada fila.
 */
export function AsistenciaToggle({
  id,
  nombre,
  asistioAt,
}: {
  id: string;
  nombre: string;
  asistioAt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const presente = Boolean(asistioAt);

  async function act() {
    if (presente && !window.confirm(`¿Marcar a ${nombre} como NO presente?`)) {
      return;
    }
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/inscripciones/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: presente ? "deshacer-checkin" : "checkin",
        }),
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={act}
      disabled={busy}
      aria-label={
        presente ? `Marcar ${nombre} como no presente` : `Marcar ${nombre} como presente`
      }
      className={`min-w-24 shrink-0 rounded-brand px-3 py-3 text-sm font-bold uppercase tracking-wide disabled:opacity-60 ${
        presente
          ? "bg-primary text-primary-contrast"
          : "border-2 border-current text-muted"
      }`}
    >
      {busy
        ? "…"
        : error
          ? "Reintentar"
          : asistioAt
            ? // 24 h: más compacto que "02:38 A. M." y deja aire al nombre
              `✓ ${new Date(asistioAt).toLocaleTimeString("es-EC", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}`
            : "Marcar"}
    </button>
  );
}
