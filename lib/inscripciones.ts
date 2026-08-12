/** Fila de la tabla `inscripciones` (ver supabase/migrations/) */
export interface InscripcionRow {
  id: string;
  event_slug: string;
  nombre: string;
  email: string;
  cedula: string | null;
  /** null en eventos que no clasifican (ver registrationForm.fields.categoria) */
  categoria: string | null;
  ciudad: string | null;
  telefono: string;
  /** Identificador de los eventos por placa (rodada); null en el downhill */
  placa: string | null;
  /** Lleno = el vehículo va con dos personas (kit de alimentación para 2) */
  copiloto: string | null;
  emergencia_nombre: string | null;
  emergencia_telefono: string | null;
  club: string | null;
  comprobante_path: string | null;
  estado: "pendiente" | "verificada" | "rechazada";
  dorsal: number | null;
  created_at: string;
  verificada_at: string | null;
  rechazada_at: string | null;
  rechazo_motivo: string | null;
  correo_recibida_at: string | null;
  correo_confirmada_at: string | null;
  correo_rechazo_at: string | null;
  asistio_at: string | null;
  /**
   * Confirmada sin pago recibido: se cobra en efectivo el día del evento
   * (migración 0009). Ortogonal a `estado`, que sigue siendo 'verificada'.
   */
  pago_en_sitio: boolean;
  /** Cuándo se cobró en sitio. Null con pago_en_sitio = todavía debe. */
  pago_cobrado_at: string | null;
  /** Evidencia LOPDP: cuándo aceptó el tratamiento de datos */
  consentimiento_at: string | null;
}

/**
 * ¿Hay que cobrarle a esta persona antes de entregarle el kit?
 *
 * Único punto de decisión: lo consultan el check-in, la lista de asistencia,
 * el panel y el CSV, para que la regla no se escriba distinta en cada sitio.
 */
export function debeCobrarse(
  row: Pick<InscripcionRow, "pago_en_sitio" | "pago_cobrado_at">,
): boolean {
  return row.pago_en_sitio && !row.pago_cobrado_at;
}

export const ESTADO_LABELS: Record<InscripcionRow["estado"], string> = {
  pendiente: "Pendiente",
  verificada: "Verificada",
  rechazada: "Rechazada",
};
