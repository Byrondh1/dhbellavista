"use client";

import { useState } from "react";

/**
 * Botón de cobrar el pago en sitio, en la pantalla de check-in.
 *
 * Separado del de asistencia a propósito: cobrar y marcar presente son cosas
 * distintas y pueden pasar en cualquier orden. Idempotente en el servidor,
 * porque en la puerta puede haber dos personas con el mismo QR en pantalla.
 */
export function CobroButton({
  id,
  cobradoAt,
}: {
  id: string;
  cobradoAt: string | null;
}) {
  const [estado, setEstado] = useState<
    | { kind: "idle" }
    | { kind: "busy" }
    | { kind: "hecho"; cuando: string }
    | { kind: "error"; msg: string }
  >(cobradoAt ? { kind: "hecho", cuando: cobradoAt } : { kind: "idle" });

  if (estado.kind === "hecho") {
    return (
      <p className="rounded-brand border-2 border-warning px-6 py-4 text-xl font-bold uppercase tracking-wide text-warning">
        ✓ Pago cobrado
        <span className="mt-1 block text-xs font-normal normal-case opacity-80">
          {new Date(estado.cuando).toLocaleTimeString("es-EC", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={estado.kind === "busy"}
        onClick={async () => {
          setEstado({ kind: "busy" });
          try {
            const res = await fetch(`/api/admin/inscripciones/${id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "marcar-cobrado" }),
            });
            const body = await res.json().catch(() => null);
            if (res.ok && body?.pago_cobrado_at) {
              setEstado({ kind: "hecho", cuando: body.pago_cobrado_at });
            } else {
              setEstado({
                kind: "error",
                msg: body?.error ?? "No se pudo registrar. Intenta de nuevo.",
              });
            }
          } catch {
            setEstado({ kind: "error", msg: "Sin conexión. Intenta de nuevo." });
          }
        }}
        className="w-full rounded-brand bg-warning px-6 py-4 text-xl font-bold uppercase tracking-wide text-warning-contrast disabled:opacity-60"
      >
        {estado.kind === "busy" ? "Registrando…" : "Registrar cobro"}
      </button>
      {estado.kind === "error" && (
        <p role="alert" className="mt-3 text-sm text-warning">
          {estado.msg}
        </p>
      )}
    </div>
  );
}
