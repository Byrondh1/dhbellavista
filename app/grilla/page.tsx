import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getActiveEvent } from "@/lib/event";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { Container } from "@/components/ui/Container";
import {
  agruparEnGrilla,
  franjaHoraria,
  horaVisible,
  usaGrilla,
} from "@/lib/grilla";
import {
  leerCorredores,
  leerEstadoGrilla,
  leerOrdenCategorias,
} from "@/lib/grilla-db";
import { identificadorDe } from "@/lib/identificador";

/**
 * Grilla de salida pública. Es la fuente de verdad: el correo lleva la hora
 * que había el día del envío, pero esta página refleja siempre el estado
 * actual, así que una corrección de última hora no obliga a reenviar nada.
 *
 * Se sirve desde el servidor con el service role y publicando SOLO nombre,
 * dorsal y hora. La tabla de inscripciones guarda cédulas, correos y
 * teléfonos: nada de eso sale de aquí (ver COLUMNAS_GRILLA).
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Grilla de salida",
  description: "Orden y horas de salida por categoría.",
};

export default async function GrillaPublicaPage() {
  const event = getActiveEvent();
  if (!usaGrilla(event)) notFound();

  const supabase = getSupabaseAdmin();
  if (!supabase) return <SinGrilla event={event.name} />;

  const [corredores, orden, estado] = await Promise.all([
    leerCorredores(supabase, event.slug).catch(() => []),
    leerOrdenCategorias(supabase, event),
    leerEstadoGrilla(supabase, event.slug),
  ]);

  const conHora = corredores.filter((c) => c.salida_hora);
  if (conHora.length === 0) return <SinGrilla event={event.name} />;

  const nombreDeCategoria = (id: string | null) =>
    id ? (event.categories.find((c) => c.id === id)?.name ?? id) : "Sin categoría";
  const grupos = agruparEnGrilla(conHora, orden, nombreDeCategoria);
  const ident = identificadorDe(event);

  return (
    <main className="flex-1 py-10">
      <Container className="max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Grilla de salida
          </p>
          <h1 className="text-3xl font-bold uppercase sm:text-4xl">
            {event.name}
          </h1>
          <p className="mt-2 text-muted">
            {event.date.displayLabel} · {event.location.venue}
          </p>
          <p className="mt-4 rounded-brand border border-border bg-surface p-4 text-sm text-muted">
            <span className="font-semibold text-foreground">
              Esta página manda sobre cualquier correo.
            </span>{" "}
            Si hay un cambio de último momento, aparece aquí.{" "}
            {conHora.length} corredores en la grilla.
            {estado?.horas_calculadas_at && (
              <>
                {" "}
                Actualizada el{" "}
                {new Date(estado.horas_calculadas_at).toLocaleString("es-EC", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                .
              </>
            )}
          </p>
        </header>

        <div className="space-y-8">
          {grupos.map((grupo) => (
            <section key={grupo.categoria ?? "sin-categoria"}>
              <h2 className="mb-3 flex flex-wrap items-baseline gap-x-3 text-xl font-bold uppercase">
                {grupo.nombre}
                <span className="text-sm font-medium normal-case text-muted">
                  {grupo.corredores.length}{" "}
                  {grupo.corredores.length === 1 ? "corredor" : "corredores"} ·{" "}
                  {franjaHoraria(grupo.corredores)}
                </span>
              </h2>
              <div className="overflow-x-auto rounded-brand border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface text-xs uppercase tracking-wider text-muted">
                    <tr>
                      <th className="p-3 w-16">Hora</th>
                      <th className="p-3 w-12">#</th>
                      <th className="p-3">Corredor</th>
                      <th className="p-3 w-16 text-right">{ident.label}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.corredores.map((corredor) => (
                      <tr key={corredor.id} className="border-t border-border">
                        <td className="p-3 font-bold tabular-nums text-primary">
                          {horaVisible(corredor.salida_hora)}
                        </td>
                        <td className="p-3 tabular-nums text-muted">
                          {corredor.salida_orden ?? "—"}
                        </td>
                        <td className="p-3 font-medium break-words">
                          {corredor.nombre}
                        </td>
                        <td className="p-3 text-right font-bold tabular-nums">
                          {corredor.dorsal ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>

        <p className="mt-8 text-sm text-muted">
          Cada corredor tiene su minuto fijo. Si alguien no se presenta, esa
          salida queda vacía y el resto de la grilla no se mueve.
        </p>
      </Container>
    </main>
  );
}

function SinGrilla({ event }: { event: string }) {
  return (
    <main className="flex-1 py-16">
      <Container className="max-w-2xl">
        <h1 className="text-3xl font-bold uppercase">Grilla de salida</h1>
        <p className="mt-4 rounded-brand border border-border bg-surface p-6 text-muted">
          La grilla de salida del {event} todavía no está publicada. Vuelve a
          consultar esta página más cerca del evento: cuando esté lista,
          aparecerá aquí con la hora de cada corredor.
        </p>
      </Container>
    </main>
  );
}
