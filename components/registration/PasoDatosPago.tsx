"use client";

import { useState } from "react";
import type { DatosPago } from "@/lib/datos-pago";

/**
 * Lo que expone GET /api/estado-inscripciones: los campos visibles, sin
 * `activo` ni columnas de auditoría.
 */
export type DatosPagoVisible = Omit<DatosPago, "activo">;

/** Fila etiqueta/valor de los datos bancarios (apilada en móvil) */
function Dato({
  etiqueta,
  valor,
  destacado = false,
  copiable = false,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
  copiable?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);

  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-muted">{etiqueta}</p>
        <p
          className={`mt-0.5 break-all font-semibold ${
            destacado ? "text-xl tabular-nums text-primary" : ""
          }`}
        >
          {valor}
        </p>
      </div>
      {copiable && (
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(valor);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            } catch {
              // Sin permiso de portapapeles (o contexto no seguro): el
              // usuario siempre puede seleccionar el número a mano.
            }
          }}
          className="shrink-0 rounded-brand border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted hover:text-foreground"
        >
          {copiado ? "✓ Copiado" : "Copiar"}
        </button>
      )}
    </div>
  );
}

/**
 * Primer paso del modal de inscripción: a qué cuenta depositar. Solo aparece
 * si el evento tiene datos de pago cargados y activos en el panel
 * (/admin/configuracion) y las inscripciones están abiertas.
 */
export function PasoDatosPago({
  datos,
  onContinuar,
  onCancelar,
}: {
  datos: DatosPagoVisible;
  onContinuar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-muted">
        {datos.intro ??
          "Antes de inscribirte, realiza tu depósito o transferencia a los siguientes datos:"}
      </p>

      <div className="rounded-brand border border-border bg-background px-4">
        <Dato etiqueta="Monto a pagar" valor={datos.monto} destacado />
        <Dato etiqueta="Banco" valor={datos.banco} />
        <Dato etiqueta="Tipo de cuenta" valor={datos.tipoCuenta} />
        <Dato etiqueta="Número de cuenta" valor={datos.numeroCuenta} destacado copiable />
        <Dato etiqueta="Titular" valor={datos.titular} />
        <Dato etiqueta="Cédula / RUC del titular" valor={datos.identificacionTitular} copiable />
      </div>

      <div className="rounded-brand border border-border bg-background p-4">
        <p className="text-sm font-semibold">
          Guarda el comprobante: lo subirás en el siguiente paso.
        </p>
        {datos.notas && datos.notas.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {datos.notas.map((nota) => (
              <li key={nota}>· {nota}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onContinuar}
          className="w-full rounded-brand bg-primary px-6 py-3 font-semibold uppercase tracking-wide text-primary-contrast transition-[filter] hover:brightness-110"
        >
          Ya realicé el pago, continuar
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="w-full rounded-brand border border-border px-6 py-3 font-semibold uppercase tracking-wide text-muted hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
