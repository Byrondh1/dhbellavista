import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveEvent } from "@/lib/event";
import { requireAdminUser } from "@/lib/supabase-admin-session";
import { ESTADO_LABELS, type InscripcionRow } from "@/lib/inscripciones";
import type { DatosPagoRow } from "@/lib/datos-pago";
import { rowToEstadoInscripciones } from "@/lib/estado-inscripciones";
import { identificadorDe, refDe, usaCategorias } from "@/lib/identificador";
import { Container } from "@/components/ui/Container";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { EstadoBadge } from "@/components/admin/EstadoBadge";

export const metadata: Metadata = {
  title: "Panel de inscripciones",
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; categoria?: string; q?: string }>;
}) {
  const event = getActiveEvent();
  const { estado, categoria, q } = await searchParams;
  const { supabase, user } = await requireAdminUser();

  if (!supabase) {
    return (
      <NoConfigNotice />
    );
  }
  if (!user) redirect("/admin/login");

  const { data, error } = await supabase
    .from("inscripciones")
    .select("*")
    .eq("event_slug", event.slug)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <Container className="py-16">
        <p className="rounded-brand border border-border bg-surface p-4 text-muted">
          No se pudo leer la lista de inscripciones: {error.message}
        </p>
      </Container>
    );
  }

  // Estado de las inscripciones, para avisar en grande si están cerradas: es
  // la explicación más probable de "no me llegan inscripciones nuevas".
  const { data: config } = await supabase
    .from("evento_datos_pago")
    .select("*")
    .eq("event_slug", event.slug)
    .maybeSingle();
  const cerradas =
    rowToEstadoInscripciones((config as DatosPagoRow | null) ?? null).cerradas ||
    event.registrationForm?.closed === true;

  const all = (data ?? []) as InscripcionRow[];
  const stats = {
    total: all.length,
    pendientes: all.filter((r) => r.estado === "pendiente").length,
    verificadas: all.filter((r) => r.estado === "verificada").length,
    rechazadas: all.filter((r) => r.estado === "rechazada").length,
  };

  const query = q?.trim().toLowerCase();
  const rows = all.filter(
    (r) =>
      (!estado || r.estado === estado) &&
      (!categoria || r.categoria === categoria) &&
      (!query ||
        r.nombre.toLowerCase().includes(query) ||
        (r.cedula ?? "").includes(query) ||
        (r.placa ?? "").toLowerCase().includes(query)),
  );

  // Puede venir null: los eventos sin categorías (rodada) no la guardan
  const categoryName = (id: string | null) =>
    id ? (event.categories.find((c) => c.id === id)?.name ?? id) : "—";

  const ident = identificadorDe(event);
  const clasifica = usaCategorias(event);

  return (
    <main className="flex-1 py-10">
      <Container>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Panel de inscripciones
            </p>
            <h1 className="text-3xl font-bold uppercase">{event.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/asistencia"
              className="rounded-brand bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary-contrast"
            >
              Control de asistencia
            </Link>
            <Link
              href="/admin/configuracion"
              className="rounded-brand border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground"
            >
              Configuración
            </Link>
            <LogoutButton />
          </div>
        </div>

        {cerradas && (
          <p className="mb-6 rounded-brand border border-primary/50 bg-primary/10 p-4 text-sm">
            <span className="font-semibold uppercase">
              Inscripciones cerradas.
            </span>{" "}
            Nadie puede inscribirse en este momento. Las que ya están recibidas
            se siguen verificando y acreditando con normalidad.{" "}
            <Link href="/admin/configuracion" className="font-semibold underline">
              Reabrir en Configuración
            </Link>
            .
          </p>
        )}

        <dl className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total", value: stats.total },
            { label: "Pendientes", value: stats.pendientes },
            { label: "Verificadas", value: stats.verificadas },
            { label: "Rechazadas", value: stats.rechazadas },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-brand border border-border bg-surface p-4 text-center"
            >
              <dd className="text-3xl font-bold text-primary">{value}</dd>
              <dt className="text-sm uppercase tracking-wider text-muted">
                {label}
              </dt>
            </div>
          ))}
        </dl>

        <form
          method="get"
          className="mb-6 flex flex-wrap items-end gap-3 rounded-brand border border-border bg-surface p-4"
        >
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Estado</span>
            <select
              name="estado"
              defaultValue={estado ?? ""}
              className="rounded-brand border border-border bg-background px-3 py-2"
            >
              <option value="">Todos</option>
              {Object.entries(ESTADO_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {clasifica && (
            <label className="text-sm">
              <span className="mb-1 block font-semibold">Categoría</span>
              <select
                name="categoria"
                defaultValue={categoria ?? ""}
                className="rounded-brand border border-border bg-background px-3 py-2"
              >
                <option value="">Todas</option>
                {event.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-semibold">Buscar</span>
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder={
                ident.tipo === "placa" ? "Nombre, cédula o placa" : "Nombre o cédula"
              }
              className="w-full min-w-40 rounded-brand border border-border bg-background px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-brand bg-primary px-5 py-2 font-semibold uppercase tracking-wide text-primary-contrast"
          >
            Filtrar
          </button>
        </form>

        {rows.length === 0 ? (
          <p className="rounded-brand border border-border bg-surface p-6 text-muted">
            No hay inscripciones que coincidan.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-brand border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="p-3">Nombre</th>
                  {clasifica && <th className="p-3">Categoría</th>}
                  <th className="p-3">Ciudad</th>
                  <th className="p-3">Teléfono</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">{ident.label}</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="p-3 font-medium">{row.nombre}</td>
                    {clasifica && (
                      <td className="p-3">{categoryName(row.categoria)}</td>
                    )}
                    <td className="p-3 text-muted">{row.ciudad ?? "—"}</td>
                    <td className="p-3 text-muted">{row.telefono}</td>
                    <td className="p-3">
                      <EstadoBadge estado={row.estado} />
                    </td>
                    <td className="p-3 font-bold text-primary">
                      {refDe(row, ident) ?? "—"}
                    </td>
                    <td className="p-3 text-muted">
                      {new Date(row.created_at).toLocaleDateString("es-EC", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/admin/inscripciones/${row.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Container>
    </main>
  );
}

function NoConfigNotice() {
  return (
    <Container className="py-16">
      <p className="rounded-brand border border-border bg-surface p-6 text-muted">
        El panel aún no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y
        NEXT_PUBLIC_SUPABASE_ANON_KEY (además de las claves de servidor) y
        vuelve a desplegar. Pasos completos en docs/modulo-inscripciones.md.
      </p>
    </Container>
  );
}
