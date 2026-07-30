"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MENSAJE_CIERRE_POR_DEFECTO,
  type EstadoInscripciones,
} from "@/lib/estado-inscripciones";

type Guardado =
  | { kind: "idle" }
  | { kind: "guardando" }
  | { kind: "ok"; cerradas: boolean }
  | { kind: "error"; msg: string };

/**
 * Interruptor de abrir/cerrar inscripciones. Antes esto era
 * `registrationForm.closed` en el config: cerrar obligaba a redesplegar.
 */
export function EstadoInscripcionesForm({
  inicial,
}: {
  inicial: EstadoInscripciones;
}) {
  const router = useRouter();
  const [guardado, setGuardado] = useState<Guardado>({ kind: "idle" });
  const [cerradas, setCerradas] = useState(inicial.cerradas);
  const [mensaje, setMensaje] = useState(inicial.mensaje ?? "");

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Cerrar saca el formulario de circulación para todo el mundo: vale una
    // confirmación. Reabrir no la necesita.
    if (cerradas && !inicial.cerradas) {
      const seguro = window.confirm(
        "¿Cerrar las inscripciones? Desde ya nadie podrá inscribirse: el " +
          "formulario se reemplaza por tu mensaje de cierre. Puedes reabrirlas " +
          "aquí mismo en cualquier momento.",
      );
      if (!seguro) return;
    }

    setGuardado({ kind: "guardando" });
    try {
      const res = await fetch("/api/admin/estado-inscripciones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cerradas, mensaje }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setGuardado({ kind: "error", msg: body?.error ?? "No se pudo guardar." });
        return;
      }
      setGuardado({ kind: "ok", cerradas });
      router.refresh();
    } catch {
      setGuardado({ kind: "error", msg: "Sin conexión. Intenta de nuevo." });
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-5">
      {/* Estado vigente, en grande: es lo primero que hay que poder leer */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-brand border border-border bg-surface p-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">
            Estado actual
          </p>
          <p
            className={`text-2xl font-bold uppercase ${
              inicial.cerradas ? "text-muted" : "text-primary"
            }`}
          >
            {inicial.cerradas ? "Cerradas" : "Abiertas"}
          </p>
        </div>
        {inicial.cerradas && inicial.cerradasAt && (
          <p className="text-sm text-muted">
            Cerradas desde el{" "}
            {new Date(inicial.cerradasAt).toLocaleString("es-EC", {
              // `day: "numeric"` y no "2-digit": es-EC formatea el segundo
              // como "01-septiembre" en lugar de "1 de septiembre"
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </p>
        )}
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-semibold">
          ¿Se puede inscribir la gente?
        </legend>
        <Opcion
          checked={!cerradas}
          onChange={() => setCerradas(false)}
          titulo="Abiertas"
          detalle="El botón de inscripción abre el formulario con normalidad."
        />
        <Opcion
          checked={cerradas}
          onChange={() => setCerradas(true)}
          titulo="Cerradas"
          detalle="El modal muestra el mensaje de cierre y el endpoint rechaza cualquier envío. Los datos bancarios no se muestran."
        />
      </fieldset>

      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor="mensaje-cierre">
          Mensaje de cierre (opcional)
        </label>
        <p className="mb-2 text-xs text-muted">
          Es lo que ve quien intente inscribirse. Útil para decir el motivo:
          cupos llenos, se venció el plazo, inscripciones en el sitio el día
          del evento… Si lo dejas vacío se usa: &ldquo;
          {MENSAJE_CIERRE_POR_DEFECTO}&rdquo;
        </p>
        <textarea
          id="mensaje-cierre"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder="Cupos llenos. Escríbenos por WhatsApp para entrar a la lista de espera."
          className="w-full rounded-brand border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted focus:border-primary"
        />
      </div>

      {guardado.kind === "error" && (
        <p role="alert" className="rounded-brand border border-primary/50 bg-primary/10 p-3 text-sm">
          {guardado.msg}
        </p>
      )}
      {guardado.kind === "ok" && (
        <p className="rounded-brand border border-border bg-surface p-3 text-sm font-medium text-primary">
          {guardado.cerradas
            ? "Inscripciones cerradas ✓ — el formulario ya no acepta envíos."
            : "Inscripciones abiertas ✓ — el formulario ya está recibiendo."}
        </p>
      )}

      <button
        type="submit"
        disabled={guardado.kind === "guardando"}
        className="rounded-brand bg-primary px-6 py-3 font-semibold uppercase tracking-wide text-primary-contrast disabled:opacity-60"
      >
        {guardado.kind === "guardando" ? "Guardando…" : "Guardar estado"}
      </button>
    </form>
  );
}

function Opcion({
  checked,
  onChange,
  titulo,
  detalle,
}: {
  checked: boolean;
  onChange: () => void;
  titulo: string;
  detalle: string;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-brand border p-4 ${
        checked ? "border-primary bg-primary/5" : "border-border bg-surface"
      }`}
    >
      <input
        type="radio"
        name="estado-inscripciones"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 shrink-0 accent-[var(--c-primary)]"
      />
      <span className="text-sm">
        <span className="font-semibold uppercase tracking-wide">{titulo}</span>
        <span className="block text-muted">{detalle}</span>
      </span>
    </label>
  );
}
