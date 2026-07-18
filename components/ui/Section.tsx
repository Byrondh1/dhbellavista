import { Container } from "./Container";

/** Envoltura estándar de sección: espaciado vertical consistente y ancla para navegación */
export function Section({
  id,
  children,
  surface = false,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  /** Fondo `surface` para alternar visualmente con `background` */
  surface?: boolean;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-16 py-16 sm:py-24 ${surface ? "bg-surface" : ""} ${className}`}
    >
      <Container>{children}</Container>
    </section>
  );
}
