import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveEvent } from "@/lib/event";
import { requireAdminUser } from "@/lib/supabase-admin-session";
import { verifyCheckinToken } from "@/lib/qr-token";
import { debeCobrarse, type InscripcionRow } from "@/lib/inscripciones";
import { identificadorDe, refDe, usaCategorias } from "@/lib/identificador";
import { Container } from "@/components/ui/Container";
import { EstadoBadge } from "@/components/admin/EstadoBadge";
import { CheckinButton } from "@/components/admin/CheckinButton";
import { CobroButton } from "@/components/admin/CobroButton";
import { leerMontoEvento } from "@/lib/datos-pago";

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
  const ident = identificadorDe(event);
  const referencia = row ? refDe(row, ident) : null;
  if (!row || referencia !== payload.ref || row.estado !== "verificada") {
    return (
      <Shell>
        <div className="rounded-brand border-2 border-primary bg-surface p-8 text-center">
          <p className="text-3xl font-bold uppercase text-primary">
            Inscripción no vigente
          </p>
          <p className="mt-3 text-muted">
            El QR es auténtico pero la inscripción ya no está verificada o su{" "}
            {ident.label.toLowerCase()} cambió. Revisa el caso en el panel.
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
    usaCategorias(event) && row.categoria
      ? (event.categories.find((c) => c.id === row.categoria)?.name ??
        row.categoria)
      : null;

  // Se lee ahora, no del token: así el aviso refleja el estado de pago de
  // este instante. Si alguien paga y se marca cobrado, el MISMO QR deja de
  // avisar sin tener que reemitir nada.
  const cobrar = debeCobrarse(row);
  const monto = cobrar ? await leerMontoEvento(supabase, event.slug) : null;

  return (
    <Shell>
      {cobrar && (
        <div className="mb-4 rounded-brand border-4 border-warning bg-warning p-5 text-center text-warning-contrast">
          <p className="text-2xl leading-tight font-bold uppercase">
            ⚠ Pago pendiente
          </p>
          <p className="mt-1 text-lg font-bold uppercase">
            Cobrar antes de entregar el kit
          </p>
          {monto && (
            <p className="mt-3 text-4xl font-bold tabular-nums">{monto}</p>
          )}
        </div>
      )}

      <div className="rounded-brand border border-border bg-surface p-8 text-center">
        <EstadoBadge estado={row.estado} />
        {/* El identificador manda: dorsal en el downhill, placa en la rodada.
            Las placas son largas, así que bajan de tamaño para no partirse. */}
        <p
          className={`mt-6 font-bold text-primary ${
            ident.tipo === "dorsal" ? "text-5xl" : "text-4xl tracking-wide"
          }`}
        >
          {ident.tipo === "dorsal" ? `#${referencia}` : referencia}
        </p>
        <p className="text-xs uppercase tracking-widest text-muted">
          {ident.label}
        </p>
        <h1 className="mt-3 text-2xl font-bold uppercase">{row.nombre}</h1>
        <p className="mt-1 text-muted">
          {[
            categoryName,
            row.club,
            row.cedula ? `CI ${row.cedula}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {/* En la rodada el kit de alimentación es por ocupantes del vehículo */}
        {event.registrationForm?.fields.copiloto && (
          <p className="mt-3 rounded-brand border border-border bg-background px-3 py-2 text-sm">
            {row.copiloto ? (
              <>
                Copiloto: <span className="font-semibold">{row.copiloto}</span> ·{" "}
                <span className="font-semibold text-primary">Kit para 2</span>
              </>
            ) : (
              <>
                Sin copiloto ·{" "}
                <span className="font-semibold text-primary">Kit para 1</span>
              </>
            )}
          </p>
        )}

        {/* Un botón por cosa: el pago y la asistencia son independientes.
            Se puede cobrar sin marcar presente y al revés — el aviso NO
            bloquea el check-in, solo se hace imposible de ignorar. */}
        {row.pago_en_sitio && (
          <div className="mt-8">
            <CobroButton id={row.id} cobradoAt={row.pago_cobrado_at} />
          </div>
        )}

        <div className="mt-4">
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
