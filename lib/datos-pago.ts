/**
 * Datos bancarios del evento, mostrados como primer paso del modal de
 * inscripción. Se editan desde /admin/configuracion y viven en Supabase
 * (tabla evento_datos_pago) — no en el config, para poder cambiarlos sin
 * redesplegar.
 */
export interface DatosPago {
  activo: boolean;
  banco: string;
  /** "Ahorros", "Corriente"… */
  tipoCuenta: string;
  numeroCuenta: string;
  titular: string;
  /** Cédula o RUC del titular, para que el banco valide el destinatario */
  identificacionTitular: string;
  /** Texto libre, ej. "$25" o "$25 (juvenil $15)" */
  monto: string;
  /** Sustituye el texto introductorio por defecto */
  intro?: string | null;
  /** Avisos extra bajo los datos */
  notas: string[];
}

/** Fila cruda de la tabla evento_datos_pago */
export interface DatosPagoRow {
  event_slug: string;
  activo: boolean;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  titular: string;
  identificacion_titular: string;
  monto: string;
  intro: string | null;
  notas: string[] | null;
  updated_at: string;
  updated_by: string | null;
}

export function rowToDatosPago(row: DatosPagoRow): DatosPago {
  return {
    activo: row.activo,
    banco: row.banco,
    tipoCuenta: row.tipo_cuenta,
    numeroCuenta: row.numero_cuenta,
    titular: row.titular,
    identificacionTitular: row.identificacion_titular,
    monto: row.monto,
    intro: row.intro,
    notas: row.notas ?? [],
  };
}

export function datosPagoToRow(
  datos: DatosPago,
  eventSlug: string,
): Omit<DatosPagoRow, "updated_at" | "updated_by"> {
  return {
    event_slug: eventSlug,
    activo: datos.activo,
    banco: datos.banco,
    tipo_cuenta: datos.tipoCuenta,
    numero_cuenta: datos.numeroCuenta,
    titular: datos.titular,
    identificacion_titular: datos.identificacionTitular,
    monto: datos.monto,
    intro: datos.intro || null,
    notas: datos.notas,
  };
}
