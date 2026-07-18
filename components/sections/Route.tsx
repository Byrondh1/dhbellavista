import Image from "next/image";
import type { RouteSection } from "@/lib/types";
import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RouteMap } from "@/components/map/RouteMap";

function formatStats(stats: RouteSection["stats"]) {
  const entries: { label: string; value: string }[] = [];
  if (stats.distanceKm != null)
    entries.push({ label: "Distancia", value: `${stats.distanceKm} km` });
  if (stats.elevationGainM != null)
    entries.push({ label: "Desnivel", value: `${stats.elevationGainM} m` });
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

  return (
    <Section id="recorrido">
      <SectionHeading kicker="La ruta" title="Recorrido" />

      {stats.length > 0 && (
        <dl className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
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

      <p className="mb-8 max-w-3xl text-lg leading-relaxed text-muted">
        {section.description}
      </p>

      <RouteMap
        mode={section.mode}
        embedUrl={section.embedUrl}
        gpxPath={section.gpxPath}
      />

      {section.allowGpxDownload && section.gpxPath && (
        <div className="mt-6">
          <ButtonLink variant="outline" href={section.gpxPath} download>
            Descargar track GPX
          </ButtonLink>
        </div>
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
