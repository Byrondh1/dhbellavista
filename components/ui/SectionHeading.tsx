export function SectionHeading({
  kicker,
  title,
  intro,
}: {
  /** Etiqueta corta sobre el título, ej. "El evento" */
  kicker?: string;
  title: string;
  intro?: string;
}) {
  return (
    <div className="mb-10 max-w-2xl">
      {kicker && (
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
          {kicker}
        </p>
      )}
      <h2 className="text-3xl font-bold uppercase tracking-tight sm:text-4xl">
        {title}
      </h2>
      {intro && <p className="mt-4 text-muted">{intro}</p>}
    </div>
  );
}
