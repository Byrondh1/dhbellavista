import { NextResponse } from "next/server";
import { getActiveEvent } from "@/lib/event";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { rowToDatosPago, type DatosPagoRow } from "@/lib/datos-pago";
import { logError, logWarn } from "@/lib/logger";

/**
 * Datos bancarios del evento para el paso de pago del modal.
 *
 * Público a propósito: la información tiene que llegar a quien se va a
 * inscribir. Aun así se sirve por aquí y no en el HTML, para que no quede
 * indexable, y devuelve SOLO los campos visibles — nunca updated_by ni
 * updated_at. No acepta parámetros: siempre responde con los datos del
 * evento de este build, así nadie puede consultar los de otro.
 *
 * Devuelve `{ datosPago: null }` (200) cuando no hay fila o está inactiva:
 * el modal lo interpreta como "no hay paso de pago" y va al formulario.
 */
export async function GET() {
  const event = getActiveEvent();

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    logWarn("GET /api/datos-pago sin Supabase configurado.");
    return NextResponse.json({ datosPago: null });
  }

  const { data, error } = await supabase
    .from("evento_datos_pago")
    .select("*")
    .eq("event_slug", event.slug)
    .maybeSingle();

  if (error) {
    logError(`No se pudieron leer los datos de pago de ${event.slug}`, error);
    // 503 para que el modal distinga "no configurado" de "falló la lectura"
    return NextResponse.json(
      { error: "No se pudieron cargar los datos de pago." },
      { status: 503 },
    );
  }

  const row = data as DatosPagoRow | null;
  if (!row || !row.activo) {
    return NextResponse.json({ datosPago: null });
  }

  const { activo, ...visibles } = rowToDatosPago(row);
  void activo;
  return NextResponse.json(
    { datosPago: visibles },
    { headers: { "Cache-Control": "no-store" } },
  );
}
