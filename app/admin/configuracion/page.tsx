import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveEvent } from "@/lib/event";
import { requireAdminUser } from "@/lib/supabase-admin-session";
import { rowToDatosPago, type DatosPagoRow } from "@/lib/datos-pago";
import { Container } from "@/components/ui/Container";
import { DatosPagoForm } from "@/components/admin/DatosPagoForm";

export const metadata: Metadata = {
  title: "Configuración del evento",
  robots: { index: false, follow: false },
};

export default async function ConfiguracionPage() {
  const event = getActiveEvent();
  const { supabase, user } = await requireAdminUser();
  if (!supabase || !user) redirect("/admin/login");

  // Lectura con la sesión del admin: pasa por RLS (is_event_admin)
  const { data, error } = await supabase
    .from("evento_datos_pago")
    .select("*")
    .eq("event_slug", event.slug)
    .maybeSingle();

  const row = data as DatosPagoRow | null;
  const datos = row ? rowToDatosPago(row) : null;

  return (
    <main className="flex-1 py-10">
      <Container className="max-w-3xl">
        <Link
          href="/admin"
          className="text-sm font-semibold text-muted hover:text-primary"
        >
          ← Volver al panel
        </Link>

        <div className="mt-4 mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Configuración · {event.name}
          </p>
          <h1 className="text-3xl font-bold uppercase">Datos de pago</h1>
          <p className="mt-3 text-muted">
            Son los datos bancarios que ve quien se va a inscribir, antes de
            llenar el formulario. Se guardan en la base: al cambiarlos aquí se
            actualizan al instante en el sitio, sin volver a desplegar.
          </p>
        </div>

        {error && (
          <p className="mb-6 rounded-brand border border-primary/50 bg-primary/10 p-4 text-sm">
            No se pudieron leer los datos guardados ({error.message}). Puedes
            escribirlos igual: al guardar se sobrescriben.
          </p>
        )}

        {!datos && !error && (
          <p className="mb-6 rounded-brand border border-border bg-surface p-4 text-sm text-muted">
            Este evento todavía no tiene datos de pago cargados. Mientras estén
            vacíos, el formulario de inscripción abre directo, sin el paso de
            pago.
          </p>
        )}

        <DatosPagoForm inicial={datos} />

        {row?.updated_at && (
          <p className="mt-6 text-xs text-muted">
            Última actualización:{" "}
            {new Date(row.updated_at).toLocaleString("es-EC")}
          </p>
        )}
      </Container>
    </main>
  );
}
