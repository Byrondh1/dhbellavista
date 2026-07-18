import type { EventConfig } from "@/lib/types";
import { registrationHref, registrationIsExternal } from "@/lib/registration";
import { ButtonLink } from "./Button";
import { WhatsAppIcon } from "./WhatsAppIcon";

/** Botón de inscripción reutilizable (hero, costos). Su destino y su ícono
 *  dependen del modo del CTA — los componentes que lo usan no saben cuál es. */
export function RegistrationCtaButton({
  event,
  label,
  className = "",
}: {
  event: EventConfig;
  label?: string;
  className?: string;
}) {
  const external = registrationIsExternal(event);
  return (
    <ButtonLink
      href={registrationHref(event)}
      className={className}
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
      {event.registrationCta.mode === "whatsapp" && <WhatsAppIcon />}
      {label ?? event.registrationCta.label}
    </ButtonLink>
  );
}
