import type { EventConfig } from "./types";
import { waLink } from "./whatsapp";

/**
 * Punto único de decisión del CTA de inscripción. Todos los botones de
 * "Inscríbete" (hero, sticky, costos) pasan por aquí, de modo que cambiar
 * el modo en el config cambia el comportamiento de todo el sitio.
 */
export function registrationHref(event: EventConfig): string {
  switch (event.registrationCta.mode) {
    case "whatsapp":
      return waLink(event.whatsapp.phone, event.whatsapp.registrationMessage);
    case "modal":
      // El modal de inscripción escucha este hash (deep-linkeable: compartir
      // el link con #inscribirse abre el formulario directamente)
      return "#inscribirse";
  }
}

/** El CTA navega fuera del sitio (target _blank) solo en modo whatsapp */
export function registrationIsExternal(event: EventConfig): boolean {
  return event.registrationCta.mode === "whatsapp";
}
