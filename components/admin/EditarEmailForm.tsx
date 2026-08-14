"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Corrige el correo del participante y reenvía el que le toque a la dirección
 * nueva, en un solo paso.
 *
 * Las dos cosas van juntas a propósito: cambiar el dato sin reenviar deja a la
 * persona igual de incomunicada, que es el problema que se está resolviendo.
 *
 * El QR no depende del correo, así que el PDF que ya tenga sigue sirviendo:
 * esto solo lo hace llegar a donde debe.
 */
export function EditarEmailForm({
  id,
  emailActual,
  /** "Correo 1 (inscripción recibida)", "Correo 2 (confirmada, con QR)"… */
  queCorreoSeEnviara,
}: {
  id: string;
  emailActual: string;
  queCorreoSeEnviara: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState(emailActual);
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState<
    { tipo: "ok" | "error"; texto: string } | null
  >(null);

  if (!abierto) {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={() => {
            setAbierto(true);
            setAviso(null);
          }}
          className="text-sm font-semibold text-primary hover:underline"
        >
          Corregir correo
        </button>
        {aviso && (
          <p
            role="status"
            className={`mt-2 text-sm ${aviso.tipo === "ok" ? "text-primary" : "text-warning"}`}
          >
            {aviso.texto}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setAviso(null);
        try {
          const res = await fetch(`/api/admin/inscripciones/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "editar-email", email: valor }),
          });
          const body = await res.json().catch(() => null);
          if (!res.ok) {
            setAviso({
              tipo: "error",
              texto: body?.error ?? "No se pudo guardar. Intenta de nuevo.",
            });
            return;
          }
          if (body?.sinCambios) {
            setAviso({ tipo: "ok", texto: "Es el mismo correo, no se cambió nada." });
          } else if (body?.emailSent) {
            setAviso({
              tipo: "ok",
              texto: `Correo corregido y ${body.etiquetaCorreo ?? "el correo"} reenviado a ${body.email}.`,
            });
          } else {
            // El dato SÍ se guardó: hay que decirlo, o parecerá que se perdió
            setAviso({
              tipo: "error",
              texto: `Correo guardado, pero el reenvío falló (${body?.emailError ?? "razón desconocida"}). Usa "Reenviar correo".`,
            });
          }
          setAbierto(false);
          router.refresh();
        } catch {
          setAviso({ tipo: "error", texto: "Sin conexión. Intenta de nuevo." });
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block text-xs uppercase tracking-wider text-muted" htmlFor={`email-${id}`}>
        Correo nuevo
      </label>
      <input
        id={`email-${id}`}
        type="email"
        required
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        // Teclado de correo en el celular, sin mayúscula automática ni
        // autocorrector: los tres arruinan una dirección al escribirla
        inputMode="email"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        autoComplete="email"
        className="w-full rounded-brand border border-border bg-background px-4 py-3 text-base"
      />
      <p className="text-sm text-muted">
        Al guardar se reenvía <strong>{queCorreoSeEnviara}</strong> a esta
        dirección.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-brand bg-primary px-6 py-3 font-semibold uppercase tracking-wide text-primary-contrast disabled:opacity-60"
        >
          {busy ? "Guardando…" : "Guardar y reenviar"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setValor(emailActual);
            setAbierto(false);
          }}
          className="rounded-brand border-2 border-current px-6 py-3 font-semibold uppercase tracking-wide text-muted disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
      {aviso && (
        <p
          role="alert"
          className={`text-sm ${aviso.tipo === "ok" ? "text-primary" : "text-warning"}`}
        >
          {aviso.texto}
        </p>
      )}
    </form>
  );
}
