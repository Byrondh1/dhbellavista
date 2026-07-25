"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Botones verificar/rechazar del detalle de una inscripción. Llaman al
 * endpoint admin (que valida la sesión en servidor) y refrescan la página.
 */
export function InscripcionActions({
  id,
  estado,
}: {
  id: string;
  estado: string;
}) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "verificar" | "rechazar") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/inscripciones/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, motivo: motivo || undefined }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "No se pudo completar la acción.");
        return;
      }
      // La acción sí funcionó, pero el correo pudo fallar: se muestra la
      // razón en lugar de dejarlo pasar en silencio.
      if (action === "verificar" && body?.emailSent === false) {
        setError(
          `Inscripción verificada, pero el correo NO salió (${body?.emailError ?? "razón desconocida"}). Revisa los logs y usa "Reenviar correo".`,
        );
      }
      router.refresh();
    } catch {
      setError("Sin conexión. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  if (estado === "verificada") {
    return (
      <p className="text-sm text-muted">
        Inscripción verificada. Para revertirla, contacta soporte de la base
        de datos (no se revierte desde el panel).
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm("¿Verificar el pago y asignar dorsal?")) {
              act("verificar");
            }
          }}
          className="rounded-brand bg-primary px-6 py-3 font-semibold uppercase tracking-wide text-primary-contrast disabled:opacity-60"
        >
          Verificar pago
        </button>
        {estado !== "rechazada" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowRejectForm((v) => !v)}
            className="rounded-brand border-2 border-current px-6 py-3 font-semibold uppercase tracking-wide text-foreground disabled:opacity-60"
          >
            Rechazar…
          </button>
        )}
      </div>

      {showRejectForm && (
        <div className="space-y-3 rounded-brand border border-border bg-background p-4">
          <label className="block text-sm font-semibold" htmlFor="motivo-rechazo">
            Motivo del rechazo (opcional)
          </label>
          <textarea
            id="motivo-rechazo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Ej.: el comprobante no corresponde a la transferencia"
            className="w-full rounded-brand border border-border bg-surface px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => act("rechazar")}
            className="rounded-brand border border-primary px-4 py-2 text-sm font-semibold uppercase text-primary disabled:opacity-60"
          >
            Confirmar rechazo
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-primary">
          {error}
        </p>
      )}
    </div>
  );
}
