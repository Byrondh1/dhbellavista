import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActiveEvent } from "@/lib/event";
import { requireAdminUser } from "@/lib/supabase-admin-session";
import { Container } from "@/components/ui/Container";
import { GrillaPanel } from "@/components/admin/GrillaPanel";
import {
  agruparEnGrilla,
  horaVisible,
  usaGrilla,
  INTERVALO_POR_DEFECTO,
} from "@/lib/grilla";
import {
  leerCorredoresParaEnvio,
  leerEstadoGrilla,
  leerOrdenCategorias,
} from "@/lib/grilla-db";
import { correoGrillaHtml } from "@/lib/email";
import { referenciaDe, identificadorDe } from "@/lib/identificador";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Grilla de salida",
  robots: { index: false, follow: false },
};

/**
 * Panel de la grilla de salida. Tres acciones separadas —ordenar categorías,
 * sortear turnos, repartir horas— y una cuarta, el envío, que no se dispara
 * sola nunca: se genera, se revisa la grilla de abajo y recién ahí se manda.
 */
export default async function GrillaAdminPage() {
  const event = getActiveEvent();
  const { supabase, user } = await requireAdminUser();
  if (!supabase || !user) redirect("/admin/login");
  if (!usaGrilla(event)) notFound();

  const [corredores, orden, estado] = await Promise.all([
    leerCorredoresParaEnvio(supabase, event.slug).catch(() => []),
    leerOrdenCategorias(supabase, event),
    leerEstadoGrilla(supabase, event.slug),
  ]);

  const nombreDeCategoria = (id: string | null) =>
    id ? (event.categories.find((c) => c.id === id)?.name ?? id) : "Sin categoría";

  const conTurno = corredores.filter((c) => c.salida_orden !== null);
  const conHora = corredores.filter((c) => c.salida_hora);
  const yaRecibieron = conHora.filter((c) => c.correo_grilla_at).length;
  const grupos = agruparEnGrilla(
    conTurno.length > 0 ? conTurno : corredores,
    orden,
    nombreDeCategoria,
  );

  // Vista previa con datos reales del primero de la grilla: es lo que va a
  // recibir la gente, no una maqueta con nombres inventados.
  const muestra = [...conHora].sort((a, b) =>
    (a.salida_hora ?? "").localeCompare(b.salida_hora ?? ""),
  )[0];
  const previewHtml = muestra
    ? correoGrillaHtml(
        event,
        muestra.nombre,
        horaVisible(muestra.salida_hora),
        muestra.categoria ? nombreDeCategoria(muestra.categoria) : null,
        referenciaDe(event, muestra),
        `${getSiteUrl(event)}/grilla`,
      )
    : null;

  const ident = identificadorDe(event);

  return (
    <main className="flex-1 py-8">
      <Container className="max-w-3xl">
        <Link
          href="/admin"
          className="text-sm font-semibold text-muted hover:text-primary"
        >
          ← Volver al panel
        </Link>

        <header className="mt-4 mb-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Grilla de salida
          </p>
          <h1 className="text-3xl font-bold uppercase">{event.name}</h1>
          <p className="mt-2 text-sm text-muted">
            {corredores.length} corredores verificados · {conTurno.length} con
            turno sorteado · {conHora.length} con hora asignada
          </p>
        </header>

        <GrillaPanel
          categorias={orden.map((id) => ({
            id,
            nombre: nombreDeCategoria(id),
            corredores: corredores.filter((c) => c.categoria === id).length,
          }))}
          totalVerificados={corredores.length}
          conTurno={conTurno.length}
          conHora={conHora.length}
          yaRecibieron={yaRecibieron}
          sorteadaAt={estado?.sorteada_at ?? null}
          horasCalculadasAt={estado?.horas_calculadas_at ?? null}
          horaInicio={estado?.hora_inicio?.slice(0, 5) ?? "12:00"}
          intervaloMin={estado?.intervalo_min ?? INTERVALO_POR_DEFECTO}
          previewHtml={previewHtml}
          urlGrillaPublica={`${getSiteUrl(event)}/grilla`}
        />

        {conTurno.length > 0 && (
          <section className="mt-10">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold uppercase">La grilla</h2>
              <Link
                href="/grilla"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Ver la página pública →
              </Link>
            </div>
            <div className="space-y-6">
              {grupos.map((grupo) => (
                <div key={grupo.categoria ?? "sin-categoria"}>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wider">
                    {grupo.nombre}{" "}
                    <span className="font-medium text-muted">
                      ({grupo.corredores.length})
                    </span>
                  </h3>
                  <div className="overflow-x-auto rounded-brand border border-border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface text-xs uppercase tracking-wider text-muted">
                        <tr>
                          <th className="p-2 w-16">Hora</th>
                          <th className="p-2 w-10">#</th>
                          <th className="p-2">Corredor</th>
                          <th className="p-2 w-14 text-right">{ident.label}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.corredores.map((corredor) => (
                          <tr key={corredor.id} className="border-t border-border">
                            <td className="p-2 font-bold tabular-nums text-primary">
                              {horaVisible(corredor.salida_hora)}
                            </td>
                            <td className="p-2 tabular-nums text-muted">
                              {corredor.salida_orden ?? "—"}
                            </td>
                            <td className="p-2 break-words">{corredor.nombre}</td>
                            <td className="p-2 text-right tabular-nums">
                              {corredor.dorsal ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </Container>
    </main>
  );
}
