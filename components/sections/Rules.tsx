import type { RulesSection } from "@/lib/types";
import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** Reglamento en acordeón accesible (details/summary nativo, sin JS) */
export function Rules({ section }: { section: RulesSection }) {
  return (
    <Section id="reglamento" surface>
      <SectionHeading kicker="Lo importante" title="Reglamento y requisitos" />

      <div className="max-w-3xl space-y-3">
        {section.items.map((item) => (
          <details
            key={item.title}
            className="group rounded-brand border border-border bg-background"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold [&::-webkit-details-marker]:hidden">
              {item.title}
              <span
                aria-hidden="true"
                className="text-primary transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="px-5 pb-5 leading-relaxed text-muted">{item.body}</p>
          </details>
        ))}
      </div>

      {section.pdfPath && (
        <div className="mt-8">
          <ButtonLink variant="outline" href={section.pdfPath} download>
            Descargar reglamento completo (PDF)
          </ButtonLink>
        </div>
      )}
    </Section>
  );
}
