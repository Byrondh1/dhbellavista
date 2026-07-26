/** Fila de la tabla `inscripciones` (ver supabase/migrations/) */
export interface InscripcionRow {
  id: string;
  event_slug: string;
  nombre: string;
  email: string;
  cedula: string | null;
  categoria: string;
  ciudad: string | null;
  telefono: string;
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
}

export const ESTADO_LABELS: Record<InscripcionRow["estado"], string> = {
  pendiente: "Pendiente",
  verificada: "Verificada",
  rechazada: "Rechazada",
};
