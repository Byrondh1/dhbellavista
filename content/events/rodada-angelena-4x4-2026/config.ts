import type { EventConfig } from "@/lib/types";
import heroImage from "./images/hero.png";
import aboutImage from "./images/about.png";
import clubLogo from "./images/logo-club.png";
import treadTexture from "./images/texture-tread.png";
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
    coordinates: { lat: 0.6266, lng: -77.9364 },
    googleMapsUrl: "https://maps.google.com/?q=0.6266,-77.9364", // TODO: pin del punto de concentración
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
    // TODO: reemplazar por el afiche del evento (1200×630, <300 KB)
    ogImagePath: "/events/rodada-angelena-4x4-2026/og.png",
  },

  whatsapp: {
    phone: "593999999999", // TODO: número real del organizador
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

    categoriesSection: {
      title: "Modalidades",
      intro:
        "La rodada es abierta: participa con tu 4x4, UTV o moto enduro. Todo vehículo debe llegar con tanque lleno y en buen estado mecánico.",
    },

    route: {
      mode: "gpx",
      // TODO: reemplazar por el track GPX real de la travesía
      gpxPath: "/events/rodada-angelena-4x4-2026/recorrido.gpx",
      stats: {
        distanceKm: 35,
        elevationGainM: 1200, // TODO: desnivel real
        maxAltitudeM: 3800,
        difficulty: "Media-Alta",
      },
      description:
        "La travesía parte del parque central de El Ángel y asciende por caminos de tercer orden hacia el páramo de la Reserva Ecológica El Ángel, entre frailejones y neblina, hasta llegar a las Lagunas de Razococha. Tramos de lodo, piedra y pendientes sostenidas: pura conducción 4x4.",
      allowGpxDownload: true,
    },

    // TODO: horarios reales del evento
    schedule: {
      days: [
        {
          dateLabel: "Día de la rodada",
          items: [
            { time: "07:00", title: "Concentración", detail: "Parque central de El Ángel." },
            { time: "07:30", title: "Registro y briefing de seguridad" },
            { time: "08:30", title: "Salida de la caravana" },
            { time: "12:00", title: "Llegada a las Lagunas de Razococha", detail: "Almuerzo y tiempo libre para fotos." },
            { time: "14:30", title: "Retorno en caravana" },
            { time: "17:00", title: "Llegada a El Ángel y cierre" },
          ],
        },
      ],
    },

    // TODO: costos y datos de pago reales
    pricing: {
      items: [
        {
          label: "Por vehículo 4x4 / UTV",
          price: "$20",
          includes: ["Sticker oficial del evento", "Hidratación", "Guía y apoyo mecánico en ruta"],
          note: "Incluye piloto y un acompañante.",
        },
        {
          label: "Motos enduro",
          price: "$15",
          includes: ["Sticker oficial del evento", "Hidratación", "Guía y apoyo mecánico en ruta"],
        },
      ],
      paymentInfo: [
        "Transferencia bancaria (datos por WhatsApp)",
        "Efectivo el día del registro",
      ],
      deadlineLabel: "Cupos limitados — inscríbete con anticipación.",
    },

    // TODO: reglamento definitivo (y agregar pdfPath cuando exista el PDF
    // en public/events/rodada-angelena-4x4-2026/reglamento.pdf)
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

    // TODO: fotos reales de rodadas anteriores
    gallery: {
      images: [
        { src: gallery1, alt: "Caravana 4x4 subiendo al páramo" },
        { src: gallery2, alt: "Cruce de lodo en la ruta" },
        { src: gallery3, alt: "Frailejones en la Reserva Ecológica El Ángel" },
        { src: gallery4, alt: "Vehículos junto a las Lagunas de Razococha" },
        { src: gallery5, alt: "Rescate con eslinga en pendiente" },
        { src: gallery6, alt: "Grupo del 4L Off Road Club en la laguna" },
      ],
      // instagramUrl: "https://instagram.com/...",
    },

    contact: {
      organizers: [
        {
          name: "Byron Herrería",
          role: "Organizador — 4L Off Road Club",
          phone: "593999999999", // TODO: número real
        },
      ],
      showCommunityCta: true,
    },
  },
};

export default config;
