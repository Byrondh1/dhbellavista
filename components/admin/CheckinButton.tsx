"use client";

import { useState } from "react";

/** Botón de marcar presente en el check-in. Idempotente en el servidor. */
export function CheckinButton({
  id,
  asistioAt,
}: {
  id: string;
  asistioAt: string | null;
}) {
  const [estado, setEstado] = useState<
    { kind: "idle" } | { kind: "busy" } | { kind: "hecho"; cuando: string } | { kind: "error"; msg: string }
  >(asistioAt ? { kind: "hecho", cuando: asistioAt } : { kind: "idle" });

  if (estado.kind === "hecho") {
    return (
      <p className="rounded-brand bg-primary px-6 py-4 text-xl font-bold uppercase tracking-wide text-primary-contrast">
        ✓ Presente
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
              body: JSON.stringify({ action: "checkin" }),
            });
            const body = await res.json().catch(() => null);
            if (res.ok && body?.asistio_at) {
              setEstado({ kind: "hecho", cuando: body.asistio_at });
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
        className="w-full rounded-brand bg-primary px-6 py-4 text-xl font-bold uppercase tracking-wide text-primary-contrast disabled:opacity-60"
      >
        {estado.kind === "busy" ? "Registrando…" : "Marcar presente"}
      </button>
      {estado.kind === "error" && (
        <p role="alert" className="mt-3 text-sm text-primary">
          {estado.msg}
        </p>
      )}
    </div>
  );
}
