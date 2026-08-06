import type { EventConfig } from "./types";
import { EB_CORP } from "./ebcorp";
import { getSiteUrl } from "./site-url";

/** Convierte "$25" / "25 USD" en número para schema.org; null si no se puede */
function parsePrice(price: string): number | null {
  const numeric = parseFloat(price.replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

/**
 * JSON-LD schema.org tipo SportsEvent, derivado del config. Ayuda a que
 * Google muestre el evento con fecha, lugar y precios en los resultados.
 */
export function buildEventJsonLd(config: EventConfig): Record<string, unknown> {
  const siteUrl = getSiteUrl(config);

  const offers = (config.sections.pricing?.items ?? [])
    .map((item) => ({ item, price: parsePrice(item.price) }))
    .filter(({ price }) => price !== null)
    .map(({ item, price }) => ({
      "@type": "Offer",
      name: item.label,
      price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: siteUrl,
    }));

  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: config.name,
    description: config.seo.description,
    startDate: config.date.start,
    ...(config.date.end && { endDate: config.date.end }),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: config.location.venue,
      address: {
        "@type": "PostalAddress",
        addressLocality: config.location.city,
        addressRegion: config.location.province,
        addressCountry: config.location.country,
      },
      ...(config.location.coordinates && {
        geo: {
          "@type": "GeoCoordinates",
          latitude: config.location.coordinates.lat,
          longitude: config.location.coordinates.lng,
        },
      }),
    },
    organizer: {
      "@type": "Organization",
      name: config.club.name,
      url: siteUrl,
      // Con "+" y código de país: es lo que schema.org espera y lo que hace
      // que el número sea marcable desde el resultado de búsqueda.
      telephone: `+${config.whatsapp.phone.replace(/\D/g, "")}`,
      ...(config.sections.contact?.email && {
        email: config.sections.contact.email,
      }),
      // Buzón de inscripciones: `reservations` es el contactType de
      // schema.org para reservas e inscripciones a un evento.
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "reservations",
        email: EB_CORP.inscripciones,
        availableLanguage: "Spanish",
      },
    },
    ...(config.seo.ogImagePath && {
      image: [`${siteUrl}${config.seo.ogImagePath}`],
    }),
    url: siteUrl,
    ...(offers.length > 0 && { offers }),
  };
}
