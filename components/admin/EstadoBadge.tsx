import {
  debeCobrarse,
  ESTADO_LABELS,
  type InscripcionRow,
} from "@/lib/inscripciones";

const ESTADO_CLASSES: Record<InscripcionRow["estado"], string> = {
  pendiente: "border-border text-muted",
  verificada: "border-primary text-primary",
  rechazada: "border-border text-muted line-through",
};

export function EstadoBadge({ estado }: { estado: InscripcionRow["estado"] }) {
  return (
    <span
      className={`inline-block rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wider ${ESTADO_CLASSES[estado]}`}
    >
      {ESTADO_LABELS[estado]}
    </span>
  );
}

/**
 * Distintivo de "hay que cobrarle", junto al estado y no en su lugar: la
 * inscripción está verificada de verdad, lo que falta es el dinero.
 * No se muestra nada una vez cobrado — el dato queda en el CSV y en la ficha.
 */
export function CobroBadge({
  row,
}: {
  row: Pick<InscripcionRow, "pago_en_sitio" | "pago_cobrado_at">;
}) {
  if (!debeCobrarse(row)) return null;
  return (
    <span className="inline-block rounded-full bg-warning px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-warning-contrast">
      ⚠ Cobrar en sitio
    </span>
  );
}
