import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveEvent } from "@/lib/event";
import { requireAdminUser } from "@/lib/supabase-admin-session";
import {
  datosPagoCompletos,
  rowToDatosPago,
  type DatosPagoRow,
} from "@/lib/datos-pago";
import { rowToEstadoInscripciones } from "@/lib/estado-inscripciones";
import { Container } from "@/components/ui/Container";
import { DatosPagoForm } from "@/components/admin/DatosPagoForm";
import { EstadoInscripcionesForm } from "@/components/admin/EstadoInscripcionesForm";

// Siempre por petición: depende de la sesión del admin. Sin esto, si al
// construir faltan las variables de Supabase, Next la prerenderiza estática
// y hornea el redirect al login.
export const dynamic = "force-dynamic";

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
  const estado = rowToEstadoInscripciones(row);
  // Override de código: si el config del evento trae `closed: true`, el sitio
  // está cerrado aunque aquí diga "abiertas". Hay que avisarlo o el
  // interruptor parece roto.
  const cerradoPorConfig = event.registrationForm?.closed === true;

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
          <h1 className="text-3xl font-bold uppercase">Inscripciones</h1>
          <p className="mt-3 text-muted">
            Lo que se puede cambiar sin volver a desplegar el sitio: si las
            inscripciones están abiertas y a qué cuenta se deposita. Se guarda
            en la base y surte efecto al instante.
          </p>
        </div>

        {error && (
          <p className="mb-6 rounded-brand border border-primary/50 bg-primary/10 p-4 text-sm">
            No se pudo leer la configuración guardada ({error.message}). Puedes
            escribirla igual: al guardar se sobrescribe. Si el mensaje habla de
            una columna que no existe, falta ejecutar la migración
            correspondiente en Supabase.
          </p>
        )}

        <section className="mb-12">
          <h2 className="mb-2 text-xl font-bold uppercase">
            Estado de las inscripciones
          </h2>
          <p className="mb-5 text-sm text-muted">
            Ciérralas cuando se llenen los cupos o se venza el plazo. No borra
            nada: las inscripciones ya recibidas siguen en el panel y puedes
            seguir verificándolas y acreditándolas con normalidad.
          </p>

          {cerradoPorConfig && (
            <p className="mb-5 rounded-brand border border-primary/50 bg-primary/10 p-4 text-sm">
              <span className="font-semibold">Atención:</span> este evento está
              cerrado por configuración del código (
              <code>registrationForm.closed: true</code> en el config). Ese
              candado manda sobre el interruptor de abajo: aunque aquí lo dejes
              en &ldquo;abiertas&rdquo;, el sitio seguirá mostrando las
              inscripciones cerradas hasta que se quite del config y se
              redespliegue.
            </p>
          )}

          <EstadoInscripcionesForm inicial={estado} />
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold uppercase">Datos de pago</h2>
          <p className="mb-5 text-sm text-muted">
            Son los datos bancarios que ve quien se va a inscribir, antes de
            llenar el formulario. Al cambiarlos aquí se actualizan al instante
            en el sitio.
          </p>

          {!datosPagoCompletos(datos) && !error && (
            <p className="mb-5 rounded-brand border border-border bg-surface p-4 text-sm text-muted">
              Este evento todavía no tiene datos de pago cargados. Mientras
              estén vacíos, el formulario de inscripción abre directo, sin el
              paso de pago.
            </p>
          )}

          <DatosPagoForm inicial={datos} />
        </section>

        {row?.updated_at && (
          <p className="mt-8 text-xs text-muted">
            Última actualización:{" "}
            {new Date(row.updated_at).toLocaleString("es-EC")}
          </p>
        )}
      </Container>
    </main>
  );
}
