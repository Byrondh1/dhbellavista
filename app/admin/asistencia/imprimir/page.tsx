import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveEvent } from "@/lib/event";
import { requireAdminUser } from "@/lib/supabase-admin-session";
import type { InscripcionRow } from "@/lib/inscripciones";
import { BotonImprimir } from "@/components/admin/BotonImprimir";

// Siempre por petición: depende de la sesión del admin. Sin esto, si al
// construir faltan las variables de Supabase, Next la prerenderiza estática
// y hornea el redirect al login.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lista de acreditación para imprimir",
  robots: { index: false, follow: false },
};

/**
 * Lista de acreditación en papel, para el día del evento cuando no hay
 * señal (el páramo de El Ángel es zona muerta). Agrupada por categoría,
 * con casilla para marcar a mano y espacio de firma.
 *
 * Nota de estilo: esta página usa negro sobre blanco EXPLÍCITO en lugar de
 * los tokens del tema del evento. Es intencional: los temas son oscuros y
 * al imprimirlos se gastaría media tinta del cartucho y quedaría ilegible.
 */
export default async function ImprimirAsistenciaPage() {
  const event = getActiveEvent();
  const { supabase, user } = await requireAdminUser();
  if (!supabase || !user) redirect("/admin/login");

  const { data, error } = await supabase
    .from("inscripciones")
    .select("*")
    .eq("event_slug", event.slug)
    .eq("estado", "verificada")
    .order("categoria", { ascending: true })
    .order("dorsal", { ascending: true });

  if (error) {
    return (
      <main className="p-8 text-black">
        No se pudo generar la lista: {error.message}
      </main>
    );
  }

  const verificados = (data ?? []) as InscripcionRow[];

  // Agrupadas por categoría, en el orden del config (el mismo que ve el
  // público en la sección Categorías)
  const grupos = event.categories
    .map((categoria) => ({
      categoria,
      inscritos: verificados.filter((r) => r.categoria === categoria.id),
    }))
    .filter((g) => g.inscritos.length > 0);

  // Cualquier categoría que ya no exista en el config no debe desaparecer
  const idsConocidos = new Set(event.categories.map((c) => c.id));
  const huerfanos = verificados.filter((r) => !idsConocidos.has(r.categoria));

  return (
    <main className="min-h-screen bg-white p-6 text-black print:p-0">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          html, body { background: #fff !important; color: #000 !important; }
          .grupo { break-inside: avoid-page; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
        }
      `}</style>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 print:mb-4">
        <div>
          <h1 className="text-2xl font-bold uppercase">
            Acreditación · {event.name}
          </h1>
          <p className="text-sm">
            {event.club.name} · {event.date.displayLabel} ·{" "}
            {event.location.venue}, {event.location.city}
          </p>
          <p className="mt-1 text-sm font-semibold">
            {verificados.length} inscritos verificados · lista generada el{" "}
            {new Date().toLocaleString("es-EC")}
          </p>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          <Link
            href="/admin/asistencia"
            className="text-sm font-semibold underline"
          >
            ← Volver
          </Link>
          <BotonImprimir />
        </div>
      </div>

      {verificados.length === 0 ? (
        <p>
          No hay inscripciones verificadas todavía: solo esas tienen dorsal y
          pueden acreditarse.
        </p>
      ) : (
        <>
          {[...grupos, ...(huerfanos.length > 0
            ? [{ categoria: { id: "otros", name: "Otras categorías" }, inscritos: huerfanos }]
            : [])].map(({ categoria, inscritos }) => (
            <section key={categoria.id} className="grupo mb-6">
              <h2 className="mb-2 border-b-2 border-black pb-1 text-lg font-bold uppercase">
                {categoria.name}{" "}
                <span className="text-sm font-normal">
                  ({inscritos.length})
                </span>
              </h2>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="w-12 border border-black p-1 text-center">
                      Llegó
                    </th>
                    <th className="w-16 border border-black p-1 text-center">
                      Dorsal
                    </th>
                    <th className="border border-black p-1">Nombre</th>
                    <th className="w-28 border border-black p-1">Cédula</th>
                    <th className="w-40 border border-black p-1">Firma</th>
                  </tr>
                </thead>
                <tbody>
                  {inscritos.map((r) => (
                    <tr key={r.id}>
                      {/* Casilla para marcar a mano */}
                      <td className="border border-black p-1 text-center align-middle text-lg">
                        ☐
                      </td>
                      <td className="border border-black p-1 text-center text-lg font-bold">
                        {r.dorsal ?? "—"}
                      </td>
                      <td className="border border-black p-1 font-medium">
                        {r.nombre}
                        {r.club ? (
                          <span className="font-normal"> · {r.club}</span>
                        ) : null}
                      </td>
                      <td className="border border-black p-1">
                        {r.cedula ?? ""}
                      </td>
                      <td className="h-9 border border-black p-1"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}

          <p className="mt-8 border-t border-black pt-2 text-xs">
            Marca la casilla &ldquo;Llegó&rdquo; al acreditar. Cuando haya
            señal, pasa las marcas al panel en Control de asistencia. Esta
            lista contiene datos personales: no la dejes sin supervisión.
          </p>
        </>
      )}
    </main>
  );
}
