import type { AnchorHTMLAttributes } from "react";

type Variant = "primary" | "outline";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-contrast hover:brightness-110 active:brightness-95",
  outline:
    "border-2 border-current text-foreground hover:bg-foreground/10",
};

/** Botón-enlace (toda la interacción principal del sitio son links: wa.me, anclas, PDFs) */
export function ButtonLink({
  variant = "primary",
  className = "",
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) {
  return (
    <a
      className={`inline-flex items-center justify-center gap-2 rounded-brand px-6 py-3 text-base font-semibold uppercase tracking-wide transition-[filter,background-color] ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}
