import type { EventConfig } from "@/lib/types";
import heroImage from "./images/hero.png";
import aboutImage from "./images/about.png";
import clubLogo from "./images/logo-club.png";
import track1 from "./images/track-1.png";
import track2 from "./images/track-2.png";
import gallery1 from "./images/gallery-1.png";
import gallery2 from "./images/gallery-2.png";
import gallery3 from "./images/gallery-3.png";
import gallery4 from "./images/gallery-4.png";
import gallery5 from "./images/gallery-5.png";
import gallery6 from "./images/gallery-6.png";
import sponsor1 from "./images/sponsor-1.png";
import sponsor2 from "./images/sponsor-2.png";
import sponsor3 from "./images/sponsor-3.png";
import sponsor4 from "./images/sponsor-4.png";
import sponsor5 from "./images/sponsor-5.png";

// TODO(Byron): reemplazar placeholders — fecha exacta, número de WhatsApp,
// links de redes/comunidad, categorías definitivas y fotos reales en images/.
const config: EventConfig = {
  slug: "downhill-la-cantera-2026",
  name: "Downhill La Cantera 2026",
  tagline:
    "Carrera nacional de MTB descenso en la pista La Cantera, El Ángel — Carchi.",

  club: {
    name: "Remnant EB",
    logo: { src: clubLogo, alt: "Logo del club Remnant EB" },
    socials: {
      // instagram: "https://instagram.com/...",
      // facebook: "https://facebook.com/...",
    },
  },

  date: {
    start: "2026-09-12", // TODO: fecha por confirmar
    displayLabel: "Septiembre 2026 · fecha por confirmar",
  },

  location: {
    venue: "Pista La Cantera",
    city: "El Ángel",
    province: "Carchi",
    country: "Ecuador",
  },

  site: {
    // domain: "downhill.<dominio-ebcorp>", // se define al comprar el dominio
    // gaId: "G-XXXXXXX",
    themeColor: "#0a0a0a",
  },

  seo: {
    title: "Downhill La Cantera 2026 — Carrera nacional de MTB descenso",
    description:
      "Carrera nacional de MTB downhill en la pista La Cantera, El Ángel, Carchi. Organiza Remnant EB. Inscripciones abiertas — septiembre 2026.",
    keywords: [
      "downhill",
      "MTB",
      "descenso",
      "La Cantera",
      "El Ángel",
      "Carchi",
      "Ecuador",
      "ciclismo",
    ],
  },

  whatsapp: {
    phone: "593999999999", // TODO: número real del organizador
    registrationMessage:
      "Hola, quiero inscribirme al Downhill La Cantera 2026. Mi nombre es: ",
    // communityInviteUrl: "https://chat.whatsapp.com/...",
  },

  theme: {
    colors: {
      primary: "#CC2200",
      primaryContrast: "#FFFFFF",
      background: "#0A0A0A",
      surface: "#161616",
      text: "#FFFFFF",
      textMuted: "#A3A3A3",
      border: "#2A2A2A",
    },
    fontHeading: "condensed",
    radius: "sharp",
  },

  categories: [
    // TODO: categorías definitivas de la carrera
    { id: "elite", name: "Élite", description: "Categoría abierta de máximo nivel." },
    { id: "master", name: "Máster 30+", description: "Corredores de 30 años en adelante." },
    { id: "juvenil", name: "Juvenil", description: "Hasta 17 años." },
    { id: "novatos", name: "Novatos", description: "Primera experiencia en competencia." },
    { id: "damas", name: "Damas", description: "Categoría femenina abierta." },
  ],

  sections: {
    hero: {
      backgroundImage: {
        src: heroImage,
        alt: "Rider de MTB descendiendo la pista La Cantera",
      },
      showCountdown: true,
      ctaLabel: "¡Inscríbete ya!",
      secondaryCtaLabel: "Únete a la comunidad",
    },

    about: {
      paragraphs: [
        "El Downhill La Cantera vuelve en 2026 con una nueva edición de la carrera de descenso más esperada del norte del país. La pista La Cantera, en las faldas de El Ángel, combina secciones técnicas de roca, peraltes naturales y saltos que exigen lo mejor de cada rider.",
        "Organizado por el club Remnant EB, el evento reúne a corredores de todo el Ecuador en un fin de semana de competencia, comunidad y puro gravity.",
      ],
      image: {
        src: aboutImage,
        alt: "Sección técnica de la pista La Cantera",
      },
      highlights: [
        { label: "Nivel", value: "Nacional" },
        { label: "Categorías", value: "5" },
        { label: "Provincia", value: "Carchi" },
        { label: "Disciplina", value: "DH" },
      ],
    },

    categoriesSection: {
      intro:
        "Compite en la categoría que va con tu nivel. Toda categoría exige casco integral y guantes; se recomienda protección completa.",
    },

    route: {
      mode: "embed",
      // TODO: reemplazar por el iframe de Google My Maps con la pista dibujada
      embedUrl: "https://maps.google.com/maps?q=0.6266,-77.9364&z=15&output=embed",
      stats: {
        distanceKm: 1.8,
        elevationGainM: 320, // TODO: desnivel real de la pista
        maxAltitudeM: 3100,
        difficulty: "Extrema",
      },
      description:
        "La pista La Cantera es un trazado corto y explosivo: secciones de roca suelta, peraltes naturales, drops y un jardín de piedras que define la carrera. Se camina en el reconocimiento y se corre con todo el domingo.",
      images: [
        { src: track1, alt: "Sección de roca de la pista La Cantera" },
        { src: track2, alt: "Salto en la parte baja de la pista" },
      ],
    },

    // TODO: horarios reales del evento
    schedule: {
      days: [
        {
          dateLabel: "Sábado (día 1)",
          items: [
            { time: "08:00", title: "Acreditación y entrega de placas" },
            { time: "09:00", title: "Reconocimiento de pista", detail: "Caminata obligatoria por la pista." },
            { time: "10:00", title: "Entrenamientos libres" },
            { time: "15:00", title: "Bajada clasificatoria" },
          ],
        },
        {
          dateLabel: "Domingo (día 2)",
          items: [
            { time: "08:00", title: "Entrenamiento de calentamiento" },
            { time: "10:00", title: "Carrera — bajada 1" },
            { time: "13:00", title: "Carrera — bajada final" },
            { time: "15:30", title: "Premiación", detail: "En la zona de meta." },
          ],
        },
      ],
    },

    // TODO: costos y datos de pago reales
    pricing: {
      items: [
        {
          label: "Inscripción general",
          price: "$25",
          includes: ["Placa de competencia", "Hidratación", "Cronometraje", "Premiación por categoría"],
        },
        {
          label: "Categoría Juvenil",
          price: "$15",
          includes: ["Placa de competencia", "Hidratación", "Cronometraje"],
          note: "Menores de edad con autorización firmada del representante.",
        },
      ],
      paymentInfo: [
        "Transferencia bancaria (datos por WhatsApp)",
        "Efectivo el día de la acreditación",
      ],
      deadlineLabel: "Inscripciones abiertas hasta completar cupos.",
    },

    // TODO: reglamento definitivo (y agregar pdfPath cuando exista el PDF
    // en public/events/downhill-la-cantera-2026/reglamento.pdf)
    rules: {
      items: [
        {
          title: "Equipo de protección obligatorio",
          body: "Casco integral, guantes cerrados y zapatillas firmes son obligatorios en entrenamientos y carrera. Se recomienda espaldar, rodilleras y coderas. Sin equipo completo no se permite largar.",
        },
        {
          title: "Estado de la bicicleta",
          body: "La bicicleta debe pasar revisión mecánica en la acreditación: frenos operativos en ambas ruedas, dirección firme y llantas en buen estado.",
        },
        {
          title: "Menores de edad",
          body: "Los menores de edad deben presentar autorización firmada por su representante legal al momento de la acreditación.",
        },
        {
          title: "Reconocimiento de pista",
          body: "La caminata de reconocimiento del sábado es obligatoria. Ningún corredor podrá entrenar sin haber completado el reconocimiento.",
        },
        {
          title: "Responsabilidad",
          body: "Cada corredor participa bajo su propia responsabilidad y firma un deslinde al inscribirse. La organización dispone de atención de primeros auxilios durante todo el evento.",
        },
      ],
    },

    // TODO: auspiciantes reales (logos en images/ y links)
    sponsors: {
      tiers: [
        {
          tier: "oro",
          sponsors: [{ name: "Auspiciante Oro", logo: { src: sponsor1, alt: "Logo de auspiciante oro" } }],
        },
        {
          tier: "plata",
          sponsors: [
            { name: "Auspiciante Plata 1", logo: { src: sponsor2, alt: "Logo de auspiciante plata" } },
            { name: "Auspiciante Plata 2", logo: { src: sponsor3, alt: "Logo de auspiciante plata" } },
          ],
        },
        {
          tier: "bronce",
          sponsors: [
            { name: "Auspiciante Bronce 1", logo: { src: sponsor4, alt: "Logo de auspiciante bronce" } },
            { name: "Auspiciante Bronce 2", logo: { src: sponsor5, alt: "Logo de auspiciante bronce" } },
          ],
        },
      ],
    },

    // TODO: fotos reales de ediciones anteriores
    gallery: {
      images: [
        { src: gallery1, alt: "Rider en la sección de roca" },
        { src: gallery2, alt: "Salto en la zona baja de la pista" },
        { src: gallery3, alt: "Público en la zona de meta" },
        { src: gallery4, alt: "Premiación de la edición anterior" },
        { src: gallery5, alt: "Corredor en el jardín de piedras" },
        { src: gallery6, alt: "Panorámica de la pista La Cantera" },
      ],
      // instagramUrl: "https://instagram.com/...",
    },

    contact: {
      organizers: [
        {
          name: "Byron Herrería",
          role: "Organizador — Remnant EB",
          phone: "593999999999", // TODO: número real
        },
      ],
      showCommunityCta: true,
    },
  },
};

export default config;
