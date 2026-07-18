import type { ScheduleSection } from "@/lib/types";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Schedule({ section }: { section: ScheduleSection }) {
  return (
    <Section id="cronograma">
      <SectionHeading kicker="Agenda" title="Cronograma" />

      <div className="grid gap-10 md:grid-cols-2">
        {section.days.map((day) => (
          <div key={day.dateLabel}>
            <h3 className="mb-6 text-xl font-bold uppercase tracking-wide">
              {day.dateLabel}
            </h3>
            <ol className="space-y-0 border-l-2 border-border">
              {day.items.map((item, i) => (
                <li key={i} className="relative pb-6 pl-6 last:pb-0">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-primary"
                  />
                  <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                    {item.time}
                  </p>
                  <p className="mt-0.5 font-semibold">{item.title}</p>
                  {item.detail && (
                    <p className="mt-0.5 text-sm text-muted">{item.detail}</p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </Section>
  );
}
