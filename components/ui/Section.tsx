import { Container } from "./Container";
import { Reveal } from "./Reveal";

/** Envoltura estándar de sección: espaciado consistente, ancla para navegación
 *  y animación sutil de entrada al hacer scroll */
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
      <Container>
        <Reveal>{children}</Reveal>
      </Container>
    </section>
  );
}
