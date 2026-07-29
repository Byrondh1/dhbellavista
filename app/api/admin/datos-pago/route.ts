import { NextResponse } from "next/server";
import { getActiveEvent } from "@/lib/event";
import { requireAdminUser } from "@/lib/supabase-admin-session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { datosPagoSchema } from "@/lib/datos-pago-schema";
import { datosPagoToRow } from "@/lib/datos-pago";
import { describeError, logError, logInfo } from "@/lib/logger";

/**
 * Guarda los datos bancarios del evento (upsert por event_slug). Solo admin
 * autenticado; la escritura se hace con service role tras validar la sesión,
 * igual que el resto de acciones del panel.
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

  const parsed = datosPagoSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Revisa los datos ingresados." },
      { status: 400 },
    );
  }

  const { intro, ...resto } = parsed.data;
  const fila = {
    ...datosPagoToRow({ ...resto, intro: intro || null }, event.slug),
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };

  const { error } = await supabase
    .from("evento_datos_pago")
    .upsert(fila, { onConflict: "event_slug" });

  if (error) {
    logError(`No se pudieron guardar los datos de pago de ${event.slug}`, error);
    return NextResponse.json(
      { error: `No se pudieron guardar: ${describeError(error)}` },
      { status: 500 },
    );
  }

  logInfo(`Datos de pago de ${event.slug} actualizados por ${user.email ?? user.id}`);
  return NextResponse.json({ ok: true });
}
