import Image from "next/image";
import type { SponsorsSection, SponsorTier } from "@/lib/types";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

const TIER_LABELS: Record<SponsorTier, string> = {
  oro: "Auspiciantes Oro",
  plata: "Auspiciantes Plata",
  bronce: "Auspiciantes Bronce",
  colaborador: "Colaboradores",
};

/** Altura del logo según el nivel del auspiciante */
const TIER_LOGO_HEIGHT: Record<SponsorTier, string> = {
  oro: "h-20 sm:h-24",
  plata: "h-14 sm:h-16",
  bronce: "h-10 sm:h-12",
  colaborador: "h-8 sm:h-10",
};

export function Sponsors({ section }: { section: SponsorsSection }) {
  return (
    <Section id="auspiciantes">
      <SectionHeading kicker="Gracias a" title="Auspiciantes" />

      <div className="space-y-12">
        {section.tiers.map(({ tier, sponsors }) => (
          <div key={tier}>
            <h3 className="mb-6 text-sm font-semibold uppercase tracking-widest text-muted">
              {TIER_LABELS[tier]}
            </h3>
            <ul className="flex flex-wrap items-center gap-4">
              {sponsors.map((sponsor) => {
                const logo = (
                  <Image
                    src={sponsor.logo.src}
                    alt={sponsor.logo.alt}
                    className={`w-auto object-contain ${TIER_LOGO_HEIGHT[tier]}`}
                  />
                );
                return (
                  <li
                    key={sponsor.name}
                    className="rounded-brand border border-border bg-surface p-4"
                  >
                    {sponsor.url ? (
                      <a
                        href={sponsor.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={sponsor.name}
                      >
                        {logo}
                      </a>
                    ) : (
                      logo
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
