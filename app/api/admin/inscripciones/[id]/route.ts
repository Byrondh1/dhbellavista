import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveEvent } from "@/lib/event";
import { requireAdminUser } from "@/lib/supabase-admin-session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const actionSchema = z.object({
  action: z.enum(["verificar", "rechazar"]),
  motivo: z.string().trim().max(300).optional(),
});

/**
 * Acciones del panel sobre una inscripción. La sesión del admin se valida
 * aquí (además del middleware); la mutación se ejecuta con service role:
 * verificar usa la función SQL atómica que asigna el dorsal secuencial por
 * categoría (migración 0002).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  const { action, motivo } = parsed.data;

  // La inscripción debe pertenecer al evento de este sitio
  const { data: row } = await supabase
    .from("inscripciones")
    .select("id, estado")
    .eq("id", id)
    .eq("event_slug", event.slug)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "Inscripción no encontrada." }, { status: 404 });
  }

  try {
    if (action === "verificar") {
      const { data: updated, error } = await supabase.rpc(
        "verificar_inscripcion",
        { p_id: id },
      );
      if (error) throw error;
      // TODO(D): disparar Correo 2 con el PDF definitivo (dorsal + QR firmado)
      return NextResponse.json({ ok: true, inscripcion: updated });
    }

    const { data: updated, error } = await supabase
      .from("inscripciones")
      .update({
        estado: "rechazada",
        rechazada_at: new Date().toISOString(),
        rechazo_motivo: motivo ?? null,
        dorsal: null,
        verificada_at: null,
      })
      .eq("id", id)
      .eq("event_slug", event.slug)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, inscripcion: updated });
  } catch (error) {
    console.error(`Error en acción admin "${action}":`, error);
    return NextResponse.json(
      { error: "No se pudo completar la acción. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
