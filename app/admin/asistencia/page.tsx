import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveEvent } from "@/lib/event";
import { requireAdminUser } from "@/lib/supabase-admin-session";
import type { InscripcionRow } from "@/lib/inscripciones";
import { Container } from "@/components/ui/Container";
import { AsistenciaToggle } from "@/components/admin/AsistenciaToggle";

export const metadata: Metadata = {
  title: "Control de asistencia",
  robots: { index: false, follow: false },
};

/**
 * Vista de acreditación del día del evento: cuántos verificados hay,
 * cuántos llegaron y cuántos faltan, con la lista ordenada por dorsal y un
 * botón grande por persona. Pensada para usarse en el celular, de pie.
 *
 * Solo lista inscripciones VERIFICADAS: son las únicas que pueden acreditarse
 * (las pendientes o rechazadas no tienen dorsal).
 */
export default async function AsistenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; q?: string; categoria?: string }>;
}) {
  const event = getActiveEvent();
  const { filtro = "todos", q, categoria } = await searchParams;
  const { supabase, user } = await requireAdminUser();
  if (!supabase || !user) redirect("/admin/login");

  const { data, error } = await supabase
    .from("inscripciones")
    .select("*")
    .eq("event_slug", event.slug)
    .eq("estado", "verificada")
    // Los dorsales son secuenciales POR CATEGORÍA, así que puede haber varios
    // "1": agrupar por categoría evita confusiones en la acreditación.
    .order("categoria", { ascending: true })
    .order("dorsal", { ascending: true });

  if (error) {
    return (
      <Container className="py-16">
        <p className="rounded-brand border border-border bg-surface p-4 text-muted">
          No se pudo leer la lista de acreditación: {error.message}
        </p>
      </Container>
    );
  }

  const verificados = (data ?? []) as InscripcionRow[];
  const presentes = verificados.filter((r) => r.asistio_at);
  const faltan = verificados.length - presentes.length;

  const query = q?.trim().toLowerCase();
  const lista = verificados.filter((r) => {
    if (filtro === "presentes" && !r.asistio_at) return false;
    if (filtro === "faltan" && r.asistio_at) return false;
    if (categoria && r.categoria !== categoria) return false;
    if (!query) return true;
    return (
      r.nombre.toLowerCase().includes(query) ||
      (r.cedula ?? "").includes(query) ||
      String(r.dorsal ?? "").includes(query)
    );
  });

  const categoryName = (id: string) =>
    event.categories.find((c) => c.id === id)?.name ?? id;

  const porcentaje =
    verificados.length > 0
      ? Math.round((presentes.length / verificados.length) * 100)
      : 0;

  return (
    <main className="flex-1 py-8">
      <Container>
        <Link
          href="/admin"
          className="text-sm font-semibold text-muted hover:text-primary"
        >
          ← Volver al panel
        </Link>

        <div className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Acreditación · {event.name}
            </p>
            <h1 className="text-3xl font-bold uppercase">
              Control de asistencia
            </h1>
          </div>
          {/* Respaldo para el día del evento, cuando no hay señal */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/asistencia/imprimir"
              className="rounded-brand border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-muted hover:text-foreground"
            >
              Imprimir lista
            </Link>
            {/* <a download> y no <Link>: es una descarga de archivo, con
                navegación de cliente no se descargaría nada */}
            <a
              href="/api/admin/inscripciones/export"
              download
              className="rounded-brand border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-muted hover:text-foreground"
            >
              Descargar CSV
            </a>
          </div>
        </div>

        <dl className="mb-4 grid grid-cols-3 gap-3">
          {[
            { label: "Verificados", value: verificados.length, destacado: false },
            { label: "Presentes", value: presentes.length, destacado: true },
            { label: "Faltan", value: faltan, destacado: false },
          ].map(({ label, value, destacado }) => (
            <div
              key={label}
              className={`rounded-brand border p-4 text-center ${
                destacado ? "border-primary bg-primary/10" : "border-border bg-surface"
              }`}
            >
              <dd
                className={`text-3xl font-bold sm:text-4xl ${destacado ? "text-primary" : ""}`}
              >
                {value}
              </dd>
              <dt className="text-xs uppercase tracking-wider text-muted">
                {label}
              </dt>
            </div>
          ))}
        </dl>

        {/* Barra de avance de la acreditación */}
        <div
          className="mb-6 h-2 w-full overflow-hidden rounded-full bg-surface"
          role="img"
          aria-label={`${porcentaje}% de los verificados ya llegó`}
        >
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${porcentaje}%` }}
          />
        </div>

        <form
          method="get"
          className="mb-6 space-y-3 rounded-brand border border-border bg-surface p-4"
        >
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por dorsal, nombre o cédula"
            inputMode="search"
            className="w-full rounded-brand border border-border bg-background px-4 py-3"
          />
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-semibold">Mostrar</span>
              <select
                name="filtro"
                defaultValue={filtro}
                className="rounded-brand border border-border bg-background px-3 py-2"
              >
                <option value="todos">Todos</option>
                <option value="faltan">Solo los que faltan</option>
                <option value="presentes">Solo presentes</option>
              </select>
            </label>
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
            <button
              type="submit"
              className="self-end rounded-brand bg-primary px-5 py-2 font-semibold uppercase tracking-wide text-primary-contrast"
            >
              Aplicar
            </button>
          </div>
        </form>

        {verificados.length === 0 ? (
          <p className="rounded-brand border border-border bg-surface p-6 text-muted">
            Todavía no hay inscripciones verificadas. Solo las verificadas
            aparecen aquí, porque son las que tienen dorsal.
          </p>
        ) : lista.length === 0 ? (
          <p className="rounded-brand border border-border bg-surface p-6 text-muted">
            Ningún inscrito coincide con el filtro.
          </p>
        ) : (
          <ul className="space-y-2">
            {lista.map((row) => (
              <li
                key={row.id}
                className={`flex items-center gap-3 rounded-brand border p-3 ${
                  row.asistio_at
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-surface"
                }`}
              >
                <span className="min-w-12 shrink-0 text-center text-2xl font-bold tabular-nums text-primary">
                  {row.dorsal ?? "—"}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/inscripciones/${row.id}`}
                    className="block truncate font-semibold hover:text-primary"
                  >
                    {row.nombre}
                  </Link>
                  <p className="truncate text-xs text-muted">
                    {categoryName(row.categoria)}
                    {row.club ? ` · ${row.club}` : ""}
                    {row.cedula ? ` · ${row.cedula}` : ""}
                  </p>
                </div>
                <AsistenciaToggle
                  id={row.id}
                  nombre={row.nombre}
                  asistioAt={row.asistio_at}
                />
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-xs text-muted">
          Mostrando {lista.length} de {verificados.length} verificados. También
          puedes escanear el QR del PDF de cada participante para acreditarlo.
        </p>
      </Container>
    </main>
  );
}
