"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Reenvía el correo acorde al estado (pendiente → Correo 1, verificada → Correo 2) */
export function ReenviarCorreoButton({ id }: { id: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState<
    { kind: "idle" } | { kind: "busy" } | { kind: "ok" } | { kind: "error"; msg: string }
  >({ kind: "idle" });

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={estado.kind === "busy"}
        onClick={async () => {
          setEstado({ kind: "busy" });
          try {
            const res = await fetch(`/api/admin/inscripciones/${id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "reenviar-correo" }),
            });
            if (res.ok) {
              setEstado({ kind: "ok" });
              router.refresh();
            } else {
              const body = await res.json().catch(() => null);
              setEstado({
                kind: "error",
                msg: body?.error ?? "No se pudo reenviar.",
              });
            }
          } catch {
            setEstado({ kind: "error", msg: "Sin conexión. Intenta de nuevo." });
          }
        }}
        className="rounded-brand border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-muted hover:text-foreground disabled:opacity-60"
      >
        {estado.kind === "busy" ? "Enviando…" : "Reenviar correo"}
      </button>
      {estado.kind === "ok" && (
        <span className="text-sm font-medium text-primary">Correo enviado ✓</span>
      )}
      {estado.kind === "error" && (
        <span role="alert" className="text-sm text-primary">
          {estado.msg}
        </span>
      )}
    </div>
  );
}
