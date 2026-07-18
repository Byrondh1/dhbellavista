import type { EventConfig } from "@/lib/types";
import heroImage from "./images/hero.png";
import aboutImage from "./images/about.png";
import clubLogo from "./images/logo-club.png";
import treadTexture from "./images/texture-tread.png";

// TODO(Byron): reemplazar placeholders — fecha exacta, número de WhatsApp,
// links de redes/comunidad, categorías definitivas y fotos reales en images/.
const config: EventConfig = {
  slug: "rodada-angelena-4x4-2026",
  name: "Rodada Angeleña 4x4 2026",
  tagline:
    "Travesía off-road desde El Ángel hasta las Lagunas de Razococha, entre frailejones y páramo andino.",

  club: {
    name: "4L Off Road Club",
    logo: { src: clubLogo, alt: "Logo del 4L Off Road Club" },
    socials: {
      // instagram: "https://instagram.com/...",
      // facebook: "https://facebook.com/...",
    },
  },

  date: {
    start: "2026-09-26", // TODO: fecha por confirmar
    displayLabel: "Septiembre 2026 · fecha por confirmar",
  },

  location: {
    venue: "Parque central de El Ángel",
    city: "El Ángel",
    province: "Carchi",
    country: "Ecuador",
  },

  site: {
    // domain: "rodada4x4.<dominio-ebcorp>", // se define al comprar el dominio
    // gaId: "G-XXXXXXX",
    themeColor: "#111111",
  },

  seo: {
    title: "Rodada Angeleña 4x4 2026 — Travesía off-road a Razococha",
    description:
      "Travesía off-road El Ángel → Lagunas de Razococha organizada por el 4L Off Road Club. Páramo, frailejones y pura aventura 4x4 — septiembre 2026.",
    keywords: [
      "4x4",
      "off road",
      "rodada",
      "El Ángel",
      "Razococha",
      "Carchi",
      "Ecuador",
      "travesía",
    ],
  },

  whatsapp: {
    phone: "593999999999", // TODO: número real del organizador
    registrationMessage:
      "Hola, quiero inscribirme a la Rodada Angeleña 4x4 2026. Mi nombre es: ",
    // communityInviteUrl: "https://chat.whatsapp.com/...",
  },

  theme: {
    colors: {
      primary: "#F2B705",
      primaryContrast: "#111111",
      background: "#111111",
      surface: "#1B1B1B",
      text: "#FFFFFF",
      textMuted: "#B0B0B0",
      border: "#3A3A3A",
    },
    texture: {
      image: {
        src: treadTexture,
        alt: "",
      },
      opacity: 0.14,
      apply: ["hero", "footer"],
    },
    fontHeading: "condensed",
    radius: "sharp",
  },

  categories: [
    // TODO: categorías definitivas de la rodada
    { id: "4x4", name: "Vehículos 4x4", description: "Camionetas y jeeps 4x4." },
    { id: "utv", name: "UTV / Side by Side", description: "Vehículos utilitarios todo terreno." },
    { id: "motos", name: "Motos enduro", description: "Motocicletas de enduro y trail." },
  ],

  sections: {
    hero: {
      backgroundImage: {
        src: heroImage,
        alt: "Caravana de vehículos 4x4 cruzando el páramo de El Ángel",
      },
      showCountdown: true,
      ctaLabel: "¡Inscríbete ya!",
      secondaryCtaLabel: "Únete a la comunidad",
    },

    about: {
      paragraphs: [
        "La Rodada Angeleña es la travesía off-road insignia del 4L Off Road Club: una ruta que parte desde El Ángel y asciende por el páramo hasta las Lagunas de Razococha, atravesando el paisaje único de la Reserva Ecológica El Ángel y sus frailejones.",
        "Una jornada de manejo técnico, camaradería y naturaleza, abierta a vehículos 4x4, UTV y motos enduro. No es una carrera: es una aventura en caravana donde nadie se queda atrás.",
      ],
      image: {
        src: aboutImage,
        alt: "Lagunas de Razococha en el páramo de El Ángel",
      },
      highlights: [
        { label: "Modalidad", value: "Travesía" },
        { label: "Destino", value: "Razococha" },
        { label: "Terreno", value: "Páramo" },
        { label: "Modalidades", value: "3" },
      ],
    },
  },
};

export default config;
