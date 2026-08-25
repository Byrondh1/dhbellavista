import Image from "next/image";
import type { RouteSection } from "@/lib/types";
import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RouteMap } from "@/components/map/RouteMap";
import { colorDePendiente, LEYENDA_PENDIENTE } from "@/lib/gpx";

function formatStats(stats: RouteSection["stats"]) {
  const entries: { label: string; value: string }[] = [];
  if (stats.distanceKm != null)
    entries.push({ label: "Distancia", value: `${stats.distanceKm} km` });
  if (stats.dropM != null)
    entries.push({ label: "Caída", value: `${stats.dropM} m` });
  if (stats.elevationGainM != null)
    entries.push({ label: "Desnivel", value: `${stats.elevationGainM} m` });
  if (stats.startAltitudeM != null)
    entries.push({
      label: "Salida",
      value: `${stats.startAltitudeM.toLocaleString("es-EC")} m`,
    });
  if (stats.finishAltitudeM != null)
    entries.push({
      label: "Meta",
      value: `${stats.finishAltitudeM.toLocaleString("es-EC")} m`,
    });
  if (stats.maxAltitudeM != null)
    entries.push({
      label: "Altura máx.",
      value: `${stats.maxAltitudeM.toLocaleString("es-EC")} m`,
    });
  if (stats.difficulty)
    entries.push({ label: "Dificultad", value: stats.difficulty });
  return entries;
}

export function Route({ section }: { section: RouteSection }) {
  const stats = formatStats(section.stats);
  const conMapaGpx = section.mode === "gpx" && Boolean(section.gpxPath);
  const comoLlegar = section.startPoint
    ? `https://www.google.com/maps?q=${section.startPoint.lat.toFixed(6)},${section.startPoint.lng.toFixed(6)}`
    : null;

  return (
    <Section id="recorrido">
      <SectionHeading kicker="La ruta" title="Recorrido" />

      <p className="mb-6 max-w-3xl text-lg leading-relaxed text-muted">
        {section.description}
      </p>

      <RouteMap
        mode={section.mode}
        embedUrl={section.embedUrl}
        gpxPath={section.gpxPath}
      />

      {/* La leyenda solo tiene sentido con el trazado coloreado delante */}
      {conMapaGpx && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
          <span className="uppercase tracking-wider">Pendiente del tramo</span>
          {LEYENDA_PENDIENTE.map(({ etiqueta, pendiente }) => (
            <span key={etiqueta} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-5 rounded-full"
                style={{ backgroundColor: colorDePendiente(pendiente) }}
              />
              {etiqueta}
            </span>
          ))}
        </div>
      )}

      {(comoLlegar || (section.allowGpxDownload && section.gpxPath)) && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {comoLlegar && (
            <ButtonLink
              href={comoLlegar}
              target="_blank"
              rel="noopener noreferrer"
            >
              Cómo llegar a la salida
            </ButtonLink>
          )}
          {section.allowGpxDownload && section.gpxPath && (
            <ButtonLink
              variant="outline"
              href={section.gpxPath}
              // El corredor se lo lleva a su GPS con un nombre que se entienda,
              // no con el "recorrido.gpx" que usa el repo por convención.
              download={section.gpxFileName ?? true}
            >
              Descargar recorrido (.GPX)
            </ButtonLink>
          )}
        </div>
      )}

      {stats.length > 0 && (
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map(({ label, value }) => (
            <div
              key={label}
              className="rounded-brand border border-border bg-surface p-4 text-center"
            >
              <dd className="text-2xl font-bold text-primary sm:text-3xl">
                {value}
              </dd>
              <dt className="mt-1 text-sm uppercase tracking-wider text-muted">
                {label}
              </dt>
            </div>
          ))}
        </dl>
      )}

      {section.images && section.images.length > 0 && (
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {section.images.map((image, i) => (
            <Image
              key={i}
              src={image.src}
              alt={image.alt}
              placeholder="blur"
              sizes="(min-width: 640px) 50vw, 100vw"
              className="rounded-brand border border-border object-cover"
            />
          ))}
        </div>
      )}
    </Section>
  );
}
