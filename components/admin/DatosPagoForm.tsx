"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DatosPago } from "@/lib/datos-pago";

const inputClasses =
  "w-full rounded-brand border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted focus:border-primary";

type Estado =
  | { kind: "idle" }
  | { kind: "guardando" }
  | { kind: "ok" }
  | { kind: "error"; msg: string };

/** Formulario de los datos bancarios del evento (panel admin) */
export function DatosPagoForm({ inicial }: { inicial: DatosPago | null }) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ kind: "idle" });
  const [activo, setActivo] = useState(inicial?.activo ?? true);
  const [notas, setNotas] = useState((inicial?.notas ?? []).join("\n"));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setEstado({ kind: "guardando" });

    try {
      const res = await fetch("/api/admin/datos-pago", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activo,
          banco: String(data.get("banco") ?? ""),
          tipoCuenta: String(data.get("tipoCuenta") ?? ""),
          numeroCuenta: String(data.get("numeroCuenta") ?? ""),
          titular: String(data.get("titular") ?? ""),
          identificacionTitular: String(data.get("identificacionTitular") ?? ""),
          monto: String(data.get("monto") ?? ""),
          intro: String(data.get("intro") ?? ""),
          // Una nota por línea
          notas: notas
            .split("\n")
            .map((n) => n.trim())
            .filter(Boolean),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setEstado({ kind: "error", msg: body?.error ?? "No se pudo guardar." });
        return;
      }
      setEstado({ kind: "ok" });
      router.refresh();
    } catch {
      setEstado({ kind: "error", msg: "Sin conexión. Intenta de nuevo." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="flex items-start gap-3 rounded-brand border border-border bg-surface p-4">
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--c-primary)]"
        />
        <span className="text-sm">
          <span className="font-semibold">Mostrar el paso de pago</span>
          <span className="block text-muted">
            Si lo desmarcas, el formulario de inscripción abre directo, sin
            mostrar los datos bancarios. Los datos se conservan aquí.
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          id="banco"
          label="Banco *"
          defaultValue={inicial?.banco}
          placeholder="Banco Pichincha"
          required
        />
        <Campo
          id="tipoCuenta"
          label="Tipo de cuenta *"
          defaultValue={inicial?.tipoCuenta}
          placeholder="Ahorros"
          required
        />
        <Campo
          id="numeroCuenta"
          label="Número de cuenta *"
          defaultValue={inicial?.numeroCuenta}
          placeholder="2201234567"
          pattern="[\d-]{5,30}"
          title="Solo dígitos y guiones"
          inputMode="numeric"
          required
        />
        <Campo
          id="identificacionTitular"
          label="Cédula o RUC del titular *"
          defaultValue={inicial?.identificacionTitular}
          placeholder="0401234567"
          pattern="\d{10}|\d{13}"
          title="10 dígitos (cédula) o 13 (RUC)"
          inputMode="numeric"
          required
        />
        <Campo
          id="titular"
          label="Titular de la cuenta *"
          defaultValue={inicial?.titular}
          placeholder="Nombre completo"
          required
        />
        <Campo
          id="monto"
          label="Monto de inscripción *"
          defaultValue={inicial?.monto}
          placeholder="$25 (categoría Juvenil: $15)"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor="intro">
          Texto introductorio (opcional)
        </label>
        <p className="mb-2 text-xs text-muted">
          Si lo dejas vacío se usa: &ldquo;Antes de inscribirte, realiza tu
          depósito o transferencia a los siguientes datos&rdquo;.
        </p>
        <textarea
          id="intro"
          name="intro"
          rows={2}
          maxLength={300}
          defaultValue={inicial?.intro ?? ""}
          className={inputClasses}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor="notas">
          Notas adicionales (opcional)
        </label>
        <p className="mb-2 text-xs text-muted">
          Una por línea, máximo 5. Aparecen bajo los datos bancarios.
        </p>
        <textarea
          id="notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={4}
          className={inputClasses}
          placeholder={"Si eres de la categoría Juvenil, transfiere $15.\nEl comprobante debe mostrar el monto y la fecha."}
        />
      </div>

      {estado.kind === "error" && (
        <p role="alert" className="rounded-brand border border-primary/50 bg-primary/10 p-3 text-sm">
          {estado.msg}
        </p>
      )}
      {estado.kind === "ok" && (
        <p className="rounded-brand border border-border bg-surface p-3 text-sm font-medium text-primary">
          Datos guardados ✓ — ya se ven en el formulario de inscripción.
        </p>
      )}

      <button
        type="submit"
        disabled={estado.kind === "guardando"}
        className="rounded-brand bg-primary px-6 py-3 font-semibold uppercase tracking-wide text-primary-contrast disabled:opacity-60"
      >
        {estado.kind === "guardando" ? "Guardando…" : "Guardar datos de pago"}
      </button>
    </form>
  );
}

function Campo({
  id,
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      <input id={id} name={id} className={inputClasses} {...props} />
    </div>
  );
}
