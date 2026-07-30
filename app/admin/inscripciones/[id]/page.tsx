import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActiveEvent } from "@/lib/event";
import { requireAdminUser } from "@/lib/supabase-admin-session";
import type { InscripcionRow } from "@/lib/inscripciones";
import {
  asignaDorsal,
  identificadorDe,
  refDe,
  usaCategorias,
} from "@/lib/identificador";
import { Container } from "@/components/ui/Container";
import { EstadoBadge } from "@/components/admin/EstadoBadge";
import { InscripcionActions } from "@/components/admin/InscripcionActions";
import { ReenviarCorreoButton } from "@/components/admin/ReenviarCorreoButton";

export const metadata: Metadata = {
  title: "Detalle de inscripción",
  robots: { index: false, follow: false },
};

export default async function InscripcionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const event = getActiveEvent();
  const { id } = await params;
  const { supabase, user } = await requireAdminUser();
  if (!supabase || !user) redirect("/admin/login");

  const { data, error } = await supabase
    .from("inscripciones")
    .select("*")
    .eq("id", id)
    .eq("event_slug", event.slug)
    .maybeSingle();
  if (error || !data) notFound();
  const row = data as InscripcionRow;

  // URL firmada de corta duración para ver el comprobante del bucket privado
  let comprobanteUrl: string | null = null;
  if (row.comprobante_path) {
    const { data: signed } = await supabase.storage
      .from("comprobantes")
      .createSignedUrl(row.comprobante_path, 60);
    comprobanteUrl = signed?.signedUrl ?? null;
  }
  const comprobanteEsPdf = row.comprobante_path?.endsWith(".pdf") ?? false;

  const ident = identificadorDe(event);
  const referencia = refDe(row, ident);
  const categoryName = row.categoria
    ? (event.categories.find((c) => c.id === row.categoria)?.name ?? row.categoria)
    : null;

  const fields: { label: string; value: string | null }[] = [
    { label: "Correo", value: row.email },
    { label: "Cédula", value: row.cedula },
    // La categoría solo se muestra en eventos que clasifican
    ...(usaCategorias(event)
      ? [{ label: "Categoría", value: categoryName }]
      : []),
    { label: "Ciudad", value: row.ciudad },
    ...(ident.tipo === "placa"
      ? [{ label: ident.label, value: row.placa }]
      : []),
    ...(event.registrationForm?.fields.copiloto
      ? [
          {
            label: "Copiloto",
            // Explícito: de esto depende si el kit es para uno o para dos
            value: row.copiloto ?? "Sin copiloto (kit para 1)",
          },
        ]
      : []),
    { label: "Teléfono", value: row.telefono },
    {
      label: "Contacto de emergencia",
      value: row.emergencia_nombre
        ? `${row.emergencia_nombre} — ${row.emergencia_telefono ?? "s/n"}`
        : null,
    },
    { label: "Club / equipo", value: row.club },
    {
      label: "Inscrito el",
      value: new Date(row.created_at).toLocaleString("es-EC"),
    },
  ];

  return (
    <main className="flex-1 py-10">
      <Container className="max-w-3xl">
        <Link
          href="/admin"
          className="text-sm font-semibold text-muted hover:text-primary"
        >
          ← Volver a la lista
        </Link>

        <div className="mt-4 mb-8 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold uppercase">{row.nombre}</h1>
          <div className="flex items-center gap-3">
            <EstadoBadge estado={row.estado} />
            {referencia && (
              <span className="rounded-brand bg-primary px-3 py-1 text-lg font-bold text-primary-contrast">
                {ident.tipo === "dorsal" ? `#${referencia}` : referencia}
              </span>
            )}
          </div>
        </div>

        <dl className="mb-8 grid gap-4 sm:grid-cols-2">
          {fields.map(({ label, value }) => (
            <div
              key={label}
              className="rounded-brand border border-border bg-surface p-4"
            >
              <dt className="text-xs uppercase tracking-wider text-muted">
                {label}
              </dt>
              <dd className="mt-1 font-medium">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>

        {row.estado === "rechazada" && row.rechazo_motivo && (
          <p className="mb-8 rounded-brand border border-border bg-surface p-4 text-sm text-muted">
            <span className="font-semibold uppercase tracking-wider">
              Motivo del rechazo:{" "}
            </span>
            {row.rechazo_motivo}
          </p>
        )}

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-bold uppercase">Comprobante</h2>
          {!row.comprobante_path ? (
            <p className="text-muted">No se adjuntó comprobante.</p>
          ) : !comprobanteUrl ? (
            <p className="text-muted">
              No se pudo generar el enlace del comprobante. Recarga la página.
            </p>
          ) : comprobanteEsPdf ? (
            <a
              href={comprobanteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              Abrir comprobante PDF (enlace válido 60 s)
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal, no optimizable
            <img
              src={comprobanteUrl}
              alt={`Comprobante de ${row.nombre}`}
              className="max-h-[28rem] rounded-brand border border-border"
            />
          )}
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-bold uppercase">Correos y asistencia</h2>
          <ul className="space-y-1 text-sm text-muted">
            <li>
              Correo de recepción:{" "}
              {row.correo_recibida_at ? (
                <span className="font-medium text-foreground">
                  enviado el {new Date(row.correo_recibida_at).toLocaleString("es-EC")}
                </span>
              ) : (
                <span className="font-medium text-primary">no enviado</span>
              )}
            </li>
            <li>
              Correo de confirmación:{" "}
              {row.correo_confirmada_at ? (
                <span className="font-medium text-foreground">
                  enviado el {new Date(row.correo_confirmada_at).toLocaleString("es-EC")}
                </span>
              ) : (
                <span className="font-medium text-primary">no enviado</span>
              )}
            </li>
            <li>
              Correo de rechazo:{" "}
              {row.estado !== "rechazada" ? (
                "no aplica"
              ) : row.correo_rechazo_at ? (
                <span className="font-medium text-foreground">
                  enviado el {new Date(row.correo_rechazo_at).toLocaleString("es-EC")}
                </span>
              ) : (
                <span className="font-medium text-primary">no enviado</span>
              )}
            </li>
            <li>
              Check-in:{" "}
              {row.asistio_at ? (
                <span className="font-medium text-foreground">
                  presente desde las{" "}
                  {new Date(row.asistio_at).toLocaleTimeString("es-EC", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ) : (
                "sin registrar"
              )}
            </li>
          </ul>
          <div className="mt-4">
            <ReenviarCorreoButton id={row.id} />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold uppercase">Acciones</h2>
          <InscripcionActions
            id={row.id}
            estado={row.estado}
            dorsal={row.dorsal}
            asistioAt={row.asistio_at}
            asignaDorsal={asignaDorsal(event)}
          />
        </section>
      </Container>
    </main>
  );
}
