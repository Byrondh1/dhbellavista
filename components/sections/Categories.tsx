import type { CategoriesSection, Category } from "@/lib/types";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Categories({
  section,
  categories,
}: {
  section: CategoriesSection;
  categories: Category[];
}) {
  return (
    <Section id="categorias" surface>
      <SectionHeading
        kicker="Participa"
        title={section.title ?? "Categorías"}
        intro={section.intro}
      />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <li
            key={category.id}
            className="rounded-brand border border-border bg-background p-6"
          >
            <h3 className="text-xl font-bold uppercase tracking-wide text-primary">
              {category.name}
            </h3>
            {category.description && (
              <p className="mt-2 text-muted">{category.description}</p>
            )}
            {category.requirements && (
              <p className="mt-3 border-t border-border pt-3 text-sm text-muted">
                <span className="font-semibold uppercase tracking-wider text-foreground">
                  Requisitos:{" "}
                </span>
                {category.requirements}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}
