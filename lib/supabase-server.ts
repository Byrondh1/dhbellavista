import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase con service role — SOLO para uso en servidor (Route
 * Handlers). El service role salta RLS: nunca importar desde componentes.
 * Devuelve null si el proyecto aún no está configurado (env vars ausentes),
 * para que el endpoint responda un error claro en lugar de reventar.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
