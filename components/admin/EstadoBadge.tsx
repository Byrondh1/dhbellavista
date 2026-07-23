import { ESTADO_LABELS, type InscripcionRow } from "@/lib/inscripciones";

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
