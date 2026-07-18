import type { EventConfig } from "@/lib/types";
import heroImage from "./images/hero.png";
import aboutImage from "./images/about.png";
import clubLogo from "./images/logo-club.png";

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
  },
};

export default config;
