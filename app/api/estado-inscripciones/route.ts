import { NextResponse } from "next/server";
import { getActiveEvent } from "@/lib/event";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import {
  datosPagoCompletos,
  rowToDatosPago,
  type DatosPagoRow,
} from "@/lib/datos-pago";
import { rowToEstadoInscripciones } from "@/lib/estado-inscripciones";
import { logError, logWarn } from "@/lib/logger";

/**
 * Lo que el modal necesita saber al abrirse: si las inscripciones están
 * abiertas y, si lo están, a qué cuenta hay que depositar. Una sola petición
 * a propósito: en conexiones lentas, dos serían dos esperas.
 *
 * Público, porque la información tiene que llegar a quien se va a inscribir.
 * Aun así se sirve por aquí y no en el HTML para que no quede indexable, y
 * devuelve SOLO los campos visibles — nunca updated_by ni updated_at. No
 * acepta parámetros: siempre responde con los datos del evento de este build,
 * así nadie puede consultar los de otro.
 *
 * Si las inscripciones están cerradas, `datosPago` es null: los datos
 * bancarios ni siquiera llegan al navegador.
 */
export async function GET() {
  const event = getActiveEvent();

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    logWarn("GET /api/estado-inscripciones sin Supabase configurado.");
    return NextResponse.json({ cerradas: false, mensajeCierre: null, datosPago: null });
  }

  const { data, error } = await supabase
    .from("evento_datos_pago")
    .select("*")
    .eq("event_slug", event.slug)
    .maybeSingle();

  if (error) {
    logError(
      `No se pudo leer la configuración de inscripciones de ${event.slug}`,
      error,
    );
    // 503 para que el modal distinga "no configurado" de "falló la lectura"
    return NextResponse.json(
      { error: "No se pudo cargar la información de inscripción." },
      { status: 503 },
    );
  }

  const row = data as DatosPagoRow | null;
  const estado = rowToEstadoInscripciones(row);

  const datos = row ? rowToDatosPago(row) : null;
  // Sin fila, con el paso apagado, con los campos en blanco o con las
  // inscripciones cerradas: no hay datos de pago que mostrar.
  const mostrarDatos =
    !estado.cerradas && datos !== null && datos.activo && datosPagoCompletos(datos);

  let visibles = null;
  if (mostrarDatos && datos) {
    const { activo, ...resto } = datos;
    void activo;
    visibles = resto;
  }

  return NextResponse.json(
    {
      cerradas: estado.cerradas,
      mensajeCierre: estado.mensaje,
      datosPago: visibles,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
