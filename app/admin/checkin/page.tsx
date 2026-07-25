import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveEvent } from "@/lib/event";
import { requireAdminUser } from "@/lib/supabase-admin-session";
import { verifyCheckinToken } from "@/lib/qr-token";
import type { InscripcionRow } from "@/lib/inscripciones";
import { Container } from "@/components/ui/Container";
import { EstadoBadge } from "@/components/admin/EstadoBadge";
import { CheckinButton } from "@/components/admin/CheckinButton";

export const metadata: Metadata = {
  title: "Check-in",
  robots: { index: false, follow: false },
};

/**
 * Destino del QR del PDF definitivo. El proxy exige sesión admin;
 * aquí se valida la firma del token y se muestra al participante con el
 * botón de marcar presente.
 */
export default async function CheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const event = getActiveEvent();
  const { t } = await searchParams;
  const { supabase, user } = await requireAdminUser();
  if (!supabase || !user) redirect("/admin/login");

  const payload = t ? verifyCheckinToken(t) : null;

  if (!payload || payload.slug !== event.slug) {
    return (
      <Shell>
        <div className="rounded-brand border-2 border-primary bg-surface p-8 text-center">
          <p className="text-3xl font-bold uppercase text-primary">
            QR no válido
          </p>
          <p className="mt-3 text-muted">
            El código no corresponde a este evento o fue alterado. Verifica al
            participante manualmente en la lista de inscritos.
          </p>
        </div>
      </Shell>
    );
  }

  const { data } = await supabase
    .from("inscripciones")
    .select("*")
    .eq("id", payload.id)
    .eq("event_slug", event.slug)
    .maybeSingle();
  const row = data as InscripcionRow | null;

  // La firma era válida pero los datos deben coincidir con la base
  if (!row || row.dorsal !== payload.dorsal || row.estado !== "verificada") {
    return (
      <Shell>
        <div className="rounded-brand border-2 border-primary bg-surface p-8 text-center">
          <p className="text-3xl font-bold uppercase text-primary">
            Inscripción no vigente
          </p>
          <p className="mt-3 text-muted">
            El QR es auténtico pero la inscripción ya no está verificada o el
            dorsal cambió. Revisa el caso en el panel.
          </p>
          <Link
            href={row ? `/admin/inscripciones/${row.id}` : "/admin"}
            className="mt-4 inline-block font-semibold text-primary hover:underline"
          >
            Ver en el panel →
          </Link>
        </div>
      </Shell>
    );
  }

  const categoryName =
    event.categories.find((c) => c.id === row.categoria)?.name ?? row.categoria;

  return (
    <Shell>
      <div className="rounded-brand border border-border bg-surface p-8 text-center">
        <EstadoBadge estado={row.estado} />
        <p className="mt-6 text-5xl font-bold text-primary">#{row.dorsal}</p>
        <h1 className="mt-2 text-2xl font-bold uppercase">{row.nombre}</h1>
        <p className="mt-1 text-muted">
          {categoryName}
          {row.club ? ` · ${row.club}` : ""}
          {row.cedula ? ` · CI ${row.cedula}` : ""}
        </p>

        <div className="mt-8">
          <CheckinButton id={row.id} asistioAt={row.asistio_at} />
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const event = getActiveEvent();
  return (
    <main className="flex flex-1 items-center py-10">
      <Container className="max-w-md">
        <p className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-muted">
          Check-in · {event.name}
        </p>
        {children}
        <p className="mt-6 text-center">
          <Link href="/admin" className="text-sm text-muted hover:text-primary">
            Ir al panel
          </Link>
        </p>
      </Container>
    </main>
  );
}
