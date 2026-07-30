import { getActiveEvent } from "@/lib/event";
import { requireAdminUser } from "@/lib/supabase-admin-session";
import type { InscripcionRow } from "@/lib/inscripciones";
import { buildCsv, csvFecha } from "@/lib/csv";
import { logError, logInfo } from "@/lib/logger";

/**
 * Export CSV de todas las inscripciones del evento, para respaldo y para
 * abrir en Excel / Google Sheets.
 *
 * Se lee con la sesión del admin (pasa por RLS), no con service role.
 *
 * Dos campos se omiten a propósito: `ip_hash` (es un hash, no aporta nada en
 * una hoja de cálculo, y es dato de seguridad) y `consentimiento_texto` (el
 * mismo párrafo repetido en cada fila haría el archivo inmanejable; queda la
 * fecha de aceptación, que es la evidencia que importa).
 */
export async function GET() {
  const event = getActiveEvent();

  const { supabase, user } = await requireAdminUser();
  if (!supabase) {
    return new Response("Supabase no configurado.", { status: 503 });
  }
  if (!user) {
    return new Response("No autorizado.", { status: 401 });
  }

  const { data, error } = await supabase
    .from("inscripciones")
    .select("*")
    .eq("event_slug", event.slug)
    .order("categoria", { ascending: true })
    .order("dorsal", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    logError(`Export CSV de ${event.slug} falló`, error);
    return new Response("No se pudo generar el CSV.", { status: 500 });
  }

  const filas = (data ?? []) as InscripcionRow[];
  const nombreCategoria = (id: string) =>
    event.categories.find((c) => c.id === id)?.name ?? id;

  const csv = buildCsv(
    [
      "Dorsal",
      "Nombre",
      "Cédula",
      "Categoría",
      "Estado",
      "Presente",
      "Hora de llegada",
      "Correo",
      "Teléfono",
      "Ciudad",
      "Club o equipo",
      "Contacto emergencia",
      "Teléfono emergencia",
      "Inscrito el",
      "Verificada el",
      "Rechazada el",
      "Motivo del rechazo",
      "Correo recepción enviado",
      "Correo confirmación enviado",
      "Correo rechazo enviado",
      "Consentimiento aceptado el",
      "Comprobante (ruta)",
      "ID",
    ],
    filas.map((r) => [
      r.dorsal ?? "",
      r.nombre,
      r.cedula ?? "",
      r.categoria ? nombreCategoria(r.categoria) : "",
      r.estado,
      r.asistio_at ? "Sí" : "No",
      csvFecha(r.asistio_at),
      r.email,
      r.telefono,
      r.ciudad ?? "",
      r.club ?? "",
      r.emergencia_nombre ?? "",
      r.emergencia_telefono ?? "",
      csvFecha(r.created_at),
      csvFecha(r.verificada_at),
      csvFecha(r.rechazada_at),
      r.rechazo_motivo ?? "",
      csvFecha(r.correo_recibida_at),
      csvFecha(r.correo_confirmada_at),
      csvFecha(r.correo_rechazo_at),
      csvFecha(r.consentimiento_at),
      r.comprobante_path ?? "",
      r.id,
    ]),
  );

  const hoy = new Date().toISOString().slice(0, 10);
  logInfo(`Export CSV de ${event.slug}: ${filas.length} inscripciones`);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inscripciones-${event.slug}-${hoy}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
