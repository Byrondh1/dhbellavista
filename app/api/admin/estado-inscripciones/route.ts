import { NextResponse } from "next/server";
import { getActiveEvent } from "@/lib/event";
import { requireAdminUser } from "@/lib/supabase-admin-session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { estadoInscripcionesSchema } from "@/lib/estado-inscripciones";
import { describeError, logError, logInfo } from "@/lib/logger";

/**
 * Abre o cierra las inscripciones del evento. Solo admin autenticado; la
 * escritura se hace con service role tras validar la sesión, igual que el
 * resto de acciones del panel.
 *
 * Va separado de /api/admin/datos-pago aunque escriban la misma fila: son dos
 * decisiones independientes (guardar una cuenta nueva no debe reabrir las
 * inscripciones), y así un guardado sigue funcionando si el otro falla.
 * El upsert manda solo estas columnas, por lo que los datos bancarios de una
 * fila existente quedan intactos.
 */
export async function PUT(request: Request) {
  const event = getActiveEvent();

  const { supabase: session, user } = await requireAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Supabase no configurado." }, { status: 503 });
  }
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no configurado." }, { status: 503 });
  }

  const parsed = estadoInscripcionesSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Revisa los datos ingresados." },
      { status: 400 },
    );
  }

  const { cerradas, mensaje } = parsed.data;
  const { error } = await supabase.from("evento_datos_pago").upsert(
    {
      event_slug: event.slug,
      inscripciones_cerradas: cerradas,
      // Al reabrir se limpia la fecha: no queda un "cerradas desde" mintiendo
      inscripciones_cerradas_at: cerradas ? new Date().toISOString() : null,
      mensaje_cierre: mensaje?.trim() ? mensaje.trim() : null,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    },
    { onConflict: "event_slug" },
  );

  if (error) {
    logError(
      `No se pudo ${cerradas ? "cerrar" : "abrir"} las inscripciones de ${event.slug}`,
      error,
    );
    return NextResponse.json(
      { error: `No se pudo guardar: ${describeError(error)}` },
      { status: 500 },
    );
  }

  logInfo(
    `Inscripciones de ${event.slug} ${cerradas ? "CERRADAS" : "ABIERTAS"} por ${
      user.email ?? user.id
    }`,
  );
  return NextResponse.json({ ok: true, cerradas });
}
