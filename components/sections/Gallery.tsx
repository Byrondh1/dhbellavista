import type { GallerySection } from "@/lib/types";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GalleryGrid } from "./GalleryGrid";

export function Gallery({ section }: { section: GallerySection }) {
  return (
    <Section id="galeria" surface>
      <SectionHeading kicker="Ediciones anteriores" title="Galería" />

      <GalleryGrid images={section.images} />

      {section.instagramUrl && (
        <p className="mt-8">
          <a
            href={section.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            Ver más fotos en Instagram →
          </a>
        </p>
      )}
    </Section>
  );
}
