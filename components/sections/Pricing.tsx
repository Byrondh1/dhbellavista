import type { EventConfig, PricingSection } from "@/lib/types";
import { EB_CORP } from "@/lib/ebcorp";
import { RegistrationCtaButton } from "@/components/ui/RegistrationCtaButton";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Pricing({
  section,
  event,
}: {
  section: PricingSection;
  event: EventConfig;
}) {
  return (
    <Section id="costos" surface>
      <SectionHeading
        kicker="Inscripción"
        title="Costos"
        intro={section.deadlineLabel}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {section.items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col rounded-brand border border-border bg-background p-6"
          >
            <h3 className="font-semibold uppercase tracking-wide text-muted">
              {item.label}
            </h3>
            <p className="mt-2 text-4xl font-bold text-primary">{item.price}</p>
            {item.includes && item.includes.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm text-muted">
                {item.includes.map((benefit) => (
                  <li key={benefit} className="flex gap-2">
                    <span aria-hidden="true" className="text-primary">
                      ✓
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
            )}
            {item.note && (
              <p className="mt-4 border-t border-border pt-3 text-sm text-muted">
                {item.note}
              </p>
            )}
          </div>
        ))}
      </div>

      {section.paymentInfo && section.paymentInfo.length > 0 && (
        <div className="mt-8 rounded-brand border border-border bg-background p-6">
          <h3 className="font-semibold uppercase tracking-wide">
            Formas de pago
          </h3>
          <ul className="mt-3 space-y-1 text-muted">
            {section.paymentInfo.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10">
        <RegistrationCtaButton event={event} />
      </div>

      <p className="mt-6 text-sm text-muted">
        ¿Dudas con tu inscripción o tu pago? Escríbenos a{" "}
        <a
          href={`mailto:${EB_CORP.inscripciones}?subject=${encodeURIComponent(`Inscripción — ${event.name}`)}`}
          aria-label={`Escribir a inscripciones de ${event.name} por correo`}
          className="font-medium text-foreground hover:text-primary"
        >
          {EB_CORP.inscripciones}
        </a>
        .
      </p>
    </Section>
  );
}
