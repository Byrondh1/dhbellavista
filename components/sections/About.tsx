import Image from "next/image";
import type { AboutSection } from "@/lib/types";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function About({ section }: { section: AboutSection }) {
  return (
    <Section id="sobre-el-evento">
      <SectionHeading kicker="El evento" title={section.title ?? "Sobre el evento"} />

      <div className="grid items-start gap-10 md:grid-cols-2">
        <div className="space-y-4 text-lg leading-relaxed text-muted">
          {section.paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {section.image && (
          <Image
            src={section.image.src}
            alt={section.image.alt}
            placeholder="blur"
            sizes="(min-width: 768px) 50vw, 100vw"
            className="rounded-brand border border-border object-cover"
          />
        )}
      </div>

      {section.highlights && section.highlights.length > 0 && (
        <dl className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {section.highlights.map(({ label, value }) => (
            <div
              key={label}
              className="rounded-brand border border-border bg-surface p-4 text-center"
            >
              <dd className="text-3xl font-bold text-primary">{value}</dd>
              <dt className="mt-1 text-sm uppercase tracking-wider text-muted">
                {label}
              </dt>
            </div>
          ))}
        </dl>
      )}
    </Section>
  );
}
