"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Accion = "verificar" | "rechazar" | "revertir-verificacion";

/**
 * Acciones del detalle de una inscripción (verificar / rechazar / revertir).
 * Llaman al endpoint admin (que valida la sesión en servidor) y refrescan
 * la página.
 */
export function InscripcionActions({
  id,
  estado,
  dorsal,
  asistioAt,
}: {
  id: string;
  estado: string;
  dorsal: number | null;
  asistioAt: string | null;
}) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: Accion) {
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
      // Revertir no envía correos; verificar y rechazar sí.
      if (action !== "revertir-verificacion" && body?.emailSent === false) {
        const queHizo =
          action === "verificar" ? "Inscripción verificada" : "Inscripción rechazada";
        setError(
          `${queHizo}, pero el correo NO salió (${body?.emailError ?? "razón desconocida"}). Revisa los logs y usa "Reenviar correo".`,
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
    const advertencias = [
      `Se liberará el dorsal ${dorsal ?? "asignado"} y la inscripción volverá a estado pendiente.`,
      "El participante ya tiene un PDF con ese dorsal que dejará de ser válido (su QR mostrará \"inscripción no vigente\"). Avísale tú si hace falta: revertir no envía ningún correo.",
      ...(asistioAt
        ? ["⚠ SE BORRARÁ su registro de check-in (ya estaba marcado como presente)."]
        : []),
      "",
      "¿Continuar?",
    ].join("\n\n");

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Inscripción verificada. Si la verificaste por error, puedes
          revertirla: vuelve a pendiente y podrás verificarla de nuevo (con un
          dorsal nuevo) o rechazarla con un motivo.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm(advertencias)) act("revertir-verificacion");
          }}
          className="rounded-brand border-2 border-current px-6 py-3 font-semibold uppercase tracking-wide text-foreground disabled:opacity-60"
        >
          {busy ? "Revirtiendo…" : "Revertir verificación"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-primary">
            {error}
          </p>
        )}
      </div>
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
            Qué necesita corregir *
          </label>
          <p className="text-xs text-muted">
            Este texto se le <strong>envía al participante por correo</strong>,
            invitándolo a corregir y reintentar. Sé específico.
          </p>
          <textarea
            id="motivo-rechazo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            maxLength={300}
            required
            placeholder="Ej.: el comprobante está borroso y no se lee el número de transacción. Reenvíanos una captura nítida."
            className="w-full rounded-brand border border-border bg-surface px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={busy || motivo.trim().length < 10}
            onClick={() => act("rechazar")}
            className="rounded-brand border border-primary px-4 py-2 text-sm font-semibold uppercase text-primary disabled:opacity-40"
          >
            Rechazar y avisar por correo
          </button>
          {motivo.trim().length < 10 && (
            <p className="text-xs text-muted">
              Escribe al menos 10 caracteres para poder enviar el aviso.
            </p>
          )}
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
