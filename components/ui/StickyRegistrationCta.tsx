import type { EventConfig } from "@/lib/types";
import { registrationHref, registrationIsExternal } from "@/lib/registration";
import { WhatsAppIcon } from "./WhatsAppIcon";

/**
 * Botón sticky de inscripción, visible durante todo el scroll. Hoy navega
 * según el modo del CTA (whatsapp); cuando exista el módulo propio de
 * inscripciones, el modo "modal" lo convertirá en el disparador del
 * formulario sin cambiar el layout.
 */
export function StickyRegistrationCta({ event }: { event: EventConfig }) {
  const external = registrationIsExternal(event);
  const label = event.registrationCta.stickyLabel ?? event.registrationCta.label;

  return (
    <a
      href={registrationHref(event)}
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold uppercase tracking-wide text-primary-contrast shadow-lg shadow-black/40 transition-transform hover:scale-105"
    >
      {event.registrationCta.mode === "whatsapp" && (
        <WhatsAppIcon className="h-5 w-5" />
      )}
      {label}
    </a>
  );
}
