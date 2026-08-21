import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActiveEvent } from "@/lib/event";
import { requireAdminUser } from "@/lib/supabase-admin-session";
import { leerMontoEvento } from "@/lib/datos-pago";
import { identificadorDe } from "@/lib/identificador";
import { cupoDorsales } from "@/lib/confirmar-inscripcion";
import { DEFAULT_CONSENT_TEXT } from "@/lib/registration-schema";
import { Container } from "@/components/ui/Container";
import { InscripcionPresencialForm } from "@/components/admin/InscripcionPresencialForm";

export const metadata: Metadata = {
  title: "Inscripción en sitio",
  robots: { index: false, follow: false },
};

/**
 * Mostrador del día del evento. Inscribe, cobra en efectivo y entrega el
 * número en una sola pantalla, sin pasar por el formulario público ni por la
 * verificación posterior.
 */
export default async function InscripcionPresencialPage() {
  const event = getActiveEvent();
  const form = event.registrationForm;
  const { supabase, user } = await requireAdminUser();
  if (!supabase || !user) redirect("/admin/login");
  if (!form) notFound();

  const ident = identificadorDe(event);
  const cupo = cupoDorsales(event);

  // Cuántos números quedan, para saber en el mostrador si se puede seguir
  // inscribiendo antes de tomarle los datos a nadie. Es informativo: la
  // decisión de verdad la toma la RPC, dentro de su lock.
  let usados: number | null = null;
  if (cupo !== null) {
    const { count } = await supabase
      .from("inscripciones")
      .select("id", { count: "exact", head: true })
      .eq("event_slug", event.slug)
      .not("dorsal", "is", null);
    usados = count ?? 0;
  }
  const libres = cupo !== null && usados !== null ? cupo - usados : null;

  // Lo que hay que cobrar, tal como está configurado en el panel
  const monto = await leerMontoEvento(supabase, event.slug);

  return (
    <main className="flex-1 py-8">
      <Container className="max-w-2xl">
        <Link
          href="/admin"
          className="text-sm font-semibold text-muted hover:text-primary"
        >
          ← Volver al panel
        </Link>

        <header className="mt-4 mb-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Inscripción en sitio
          </p>
          <h1 className="text-3xl font-bold uppercase">{event.name}</h1>
          <p className="mt-2 text-sm text-muted">
            Para quien llega el día del evento y paga en efectivo. Queda
            confirmada, cobrada y con su {ident.label.toLowerCase()} asignado en
            el momento.
          </p>
        </header>

        {libres !== null && (
          <p
            className={`mb-6 rounded-brand border p-4 text-sm ${
              libres <= 0
                ? "border-warning bg-surface font-semibold text-warning"
                : "border-border bg-surface text-muted"
            }`}
          >
            {libres <= 0 ? (
              <>
                No quedan {ident.label.toLowerCase()}es libres: el cupo de{" "}
                {cupo} está lleno. No se puede inscribir a nadie más.
              </>
            ) : (
              <>
                Quedan{" "}
                <strong className="text-foreground">
                  {libres} de {cupo}
                </strong>{" "}
                {ident.label.toLowerCase()}es libres. Se asigna uno al azar
                entre los disponibles.
              </>
            )}
          </p>
        )}

        <InscripcionPresencialForm
          campos={form.fields}
          categorias={form.fields.categoria ? event.categories : []}
          identLabel={ident.label}
          placaLabel={ident.tipo === "placa" ? ident.label : "Placa del vehículo"}
          monto={monto}
          consentText={form.consentText ?? DEFAULT_CONSENT_TEXT}
        />
      </Container>
    </main>
  );
}
