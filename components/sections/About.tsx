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
              {/* Tamaño fluido y no fijo: la rejilla es de dos columnas en el
                celular, y a 30 px un valor de más de siete caracteres se sale
                de la tarjeta ("Razococha" se pasaba 23 px a 390 px). El
                break-word es el respaldo para pantallas de 320 px, donde ni
                encogiendo alcanza. */}
            <dd className="text-[clamp(1.25rem,6vw,2rem)] font-bold text-primary [overflow-wrap:break-word]">
              {value}
            </dd>
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
