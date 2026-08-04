import type { EventConfig } from "@/lib/types";
import heroImage from "./images/hero.webp";
import aboutImage from "./images/about.webp";
import clubLogo from "./images/logo-club.webp";
import treadTexture from "./images/texture-tread.webp";
import sponsor1 from "./images/sponsor-1.webp";
import sponsor2 from "./images/sponsor-2.webp";
import sponsor3 from "./images/sponsor-3.webp";
import sponsor4 from "./images/sponsor-4.webp";
import sponsor5 from "./images/sponsor-5.webp";
// Lista generada por `npm run fotos` con las gallery-N que existan
import { galeria } from "./images/galeria";

// PENDIENTE(Byron): número de WhatsApp, links de redes/comunidad, fotos
// reales en images/, auspiciantes, track GPX y el PDF del reglamento.
const config: EventConfig = {
  slug: "rodada-angelena-4x4-2026",
  name: "Rodada Angeleña 4x4 2026",
  tagline:
    "Travesía off-road desde El Ángel hasta la Laguna de Razococha, por el páramo de Carchi.",

  club: {
    name: "4L Off Road Club",
    logo: { src: clubLogo, alt: "Logo del 4L Off Road Club" },
    socials: {
      // instagram: "https://instagram.com/...",
      // facebook: "https://facebook.com/...",
    },
  },

  date: {
    start: "2026-09-05",
    displayLabel: "Sábado 5 de septiembre de 2026",
  },

  location: {
    venue: "Parque Central de El Ángel",
    city: "El Ángel",
    province: "Carchi",
    country: "Ecuador",
    coordinates: { lat: 0.6266, lng: -77.9364 },
    // Pin del Parque Central, que es el punto de concentración
    googleMapsUrl: "https://maps.google.com/?q=0.6266,-77.9364",
  },

  site: {
    // domain: "rodada4x4.<dominio-ebcorp>", // se define al comprar el dominio
    // gaId: "G-XXXXXXX",
    themeColor: "#111111",
  },

  seo: {
    title: "Rodada Angeleña 4x4 2026 — Travesía off-road a Razococha",
    description:
      "Travesía off-road desde la ciudad de El Ángel hasta la Laguna de Razococha, por caminos que desafían a cada piloto. Organiza el 4L Off Road Club — sábado 5 de septiembre de 2026.",
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
    // PENDIENTE: afiche del evento (1200×630, <300 KB)
    ogImagePath: "/events/rodada-angelena-4x4-2026/og.png",
  },

  whatsapp: {
    phone: "593999999999", // PENDIENTE: número real del organizador
    registrationMessage:
      "Hola, quiero inscribirme a la Rodada Angeleña 4x4 2026. Mi nombre es: ",
    // communityInviteUrl: "https://chat.whatsapp.com/...",
  },

  // Cambiar mode a "modal" cuando el proyecto Supabase esté configurado
  // (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Vercel + supabase/schema.sql)
  registrationCta: {
    mode: "modal",
    label: "¡Inscríbete ya!",
    stickyLabel: "Inscríbete",
  },

  registrationForm: {
    fields: {
      cedula: true,
      ciudad: true,
      // Obligatorio: es 4x4 en páramo
      emergencyContact: true,
      clubTeam: true,
      // La rodada no clasifica: las "modalidades" de la sección pública son
      // informativas y no se piden en el formulario.
      categoria: false,
      // La placa es el código de inscripción (una inscripción por vehículo)
      placa: true,
      // Lleno = kit de alimentación para dos (piloto y copiloto)
      copiloto: true,
    },
    identificador: { tipo: "placa", label: "Placa del vehículo" },
    comprobante: true,
    privacyNote:
      "Tus datos se usan únicamente para la organización del evento y no se comparten con terceros.",
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

  // Solo informativas: la rodada no clasifica y el formulario no las pide
  // (registrationForm.fields.categoria = false).
  categories: [
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
      secondaryCtaLabel: "Únete a la comunidad",
    },

    about: {
      paragraphs: [
        "Rodada Angeleña 4x4 2026 es una travesía off-road desde la ciudad de El Ángel hasta la Laguna de Razococha, por caminos que desafían a cada piloto.",
        "Una aventura por el páramo de Carchi para vivir el 4x4 en su máxima expresión. Organiza 4L Off Road Club.",
      ],
      image: {
        src: aboutImage,
        alt: "Laguna de Razococha en el páramo de El Ángel",
      },
      highlights: [
        { label: "Modalidad", value: "Travesía" },
        { label: "Destino", value: "Razococha" },
        { label: "Terreno", value: "Páramo" },
        { label: "Modalidades", value: "3" },
      ],
    },

    categoriesSection: {
      title: "Modalidades",
      intro:
        "La rodada es abierta: participa con tu 4x4, UTV o moto enduro. Todo vehículo debe llegar con tanque lleno y en buen estado mecánico.",
    },

    route: {
      mode: "gpx",
      // PENDIENTE: track GPX real de la travesía
      gpxPath: "/events/rodada-angelena-4x4-2026/recorrido.gpx",
      // PENDIENTE: distancia, desnivel y altitud reales. Sin datos no se
      // muestran cifras: es preferible a publicar una inventada.
      stats: {},
      description:
        "La travesía parte del Parque Central de El Ángel y sube por el páramo hasta la Laguna de Razococha, por caminos que desafían a cada piloto.",
      allowGpxDownload: true,
    },

    schedule: {
      days: [
        {
          dateLabel: "Sábado 5 de septiembre de 2026",
          items: [
            {
              time: "08:00",
              title: "Concentración y entrega de kits",
              detail: "Parque Central de El Ángel.",
            },
            { time: "09:00", title: "Salida" },
            { time: "15:00", title: "Regreso previsto" },
          ],
        },
      ],
    },

    pricing: {
      items: [
        {
          label: "Inscripción por vehículo",
          price: "$20",
          includes: [
            "Refrigerio",
            "Alimentación para piloto y copiloto",
            "Sticker del evento",
            "Una pala de rescate",
            "Servicio de wincha y tractor de rescate",
            "Fotografía profesional",
          ],
          note: "Los beneficios cubren solo a los participantes inscritos. Una inscripción por vehículo.",
        },
      ],
      // Los datos bancarios NO van aquí: se muestran dentro del formulario de
      // inscripción y se editan en /admin/configuracion.
      paymentInfo: [
        "Transferencia o depósito: los datos de la cuenta aparecen al inscribirte.",
        "Se sube el comprobante en el mismo formulario.",
      ],
      deadlineLabel: "Cupos limitados — inscríbete con anticipación.",
    },

    // PENDIENTE: reglamento definitivo revisado por ti (y agregar pdfPath
    // cuando exista el PDF en public/events/rodada-angelena-4x4-2026/)
    rules: {
      items: [
        {
          title: "Estado del vehículo",
          body: "Todo vehículo debe llegar con tanque lleno, llanta de emergencia, eslinga o cuerda de rescate y en buen estado mecánico. Se recomienda llevar herramienta básica.",
        },
        {
          title: "Conducción en caravana",
          body: "La caravana la abre y la cierra la organización. Está prohibido adelantar al vehículo guía o quedarse atrás del vehículo escoba sin avisar por radio o WhatsApp.",
        },
        {
          title: "Respeto a la reserva",
          body: "La ruta cruza la Reserva Ecológica El Ángel: prohibido salirse del camino, dejar basura o dañar frailejones. Lo que entra, sale con nosotros.",
        },
        {
          title: "Acompañantes y menores",
          body: "Cada vehículo puede llevar acompañantes según su capacidad legal, siempre con cinturón de seguridad. Los menores de edad viajan bajo responsabilidad de su representante.",
        },
        {
          title: "Responsabilidad",
          body: "La rodada no es una competencia. Cada participante conduce bajo su propia responsabilidad y firma un deslinde en el registro.",
        },
      ],
    },

    // PENDIENTE: auspiciantes reales (logos en images/ y links)
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

    // PENDIENTE: fotos reales de rodadas anteriores.
    // La lista sale de images/galeria.ts (la regenera `npm run fotos` con las
    // fotos que haya en la carpeta). Sin fotos, la sección no se renderiza.
    gallery:
      galeria.length > 0
        ? {
            images: galeria,
            // instagramUrl: "https://instagram.com/...",
          }
        : undefined,

    contact: {
      organizers: [
        {
          name: "Byron Herrería",
          role: "Organizador — 4L Off Road Club",
          phone: "593999999999", // PENDIENTE: número real
        },
      ],
      showCommunityCta: true,
    },
  },
};

export default config;
