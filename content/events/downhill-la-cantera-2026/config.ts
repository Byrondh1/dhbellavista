import type { Category, EventConfig } from "@/lib/types";
import { capitalizar, contarFemenino } from "@/lib/numeros";
import heroImage from "./images/hero.webp";
import aboutImage from "./images/about.webp";
import clubLogo from "./images/logo-club.webp";
import track1 from "./images/track-1.webp";
import track2 from "./images/track-2.webp";
import sponsor1 from "./images/sponsor-1.webp";
import sponsor2 from "./images/sponsor-2.webp";
import sponsor3 from "./images/sponsor-3.webp";
import sponsor4 from "./images/sponsor-4.webp";
import sponsor5 from "./images/sponsor-5.webp";
// Lista generada por `npm run fotos` con las gallery-N que existan
import { galeria } from "./images/galeria";

// PENDIENTE(Byron): número de WhatsApp, links de redes/comunidad, fotos
// reales en images/, auspiciantes y el PDF del reglamento.
//
// El slug se mantiene como "downhill-la-cantera-2026" aunque el evento pasó a
// llamarse Bella Vista: es la clave de las inscripciones ya guardadas
// (event_slug), la ruta de los comprobantes en Storage y el valor de
// NEXT_PUBLIC_EVENT en Vercel. Renombrarlo es una operación aparte.
/**
 * Las categorías del evento, EN EL ORDEN EN QUE SE CORREN. Ese orden no es
 * decorativo: es el orden de salida por defecto de la grilla.
 *
 * Va fuera del config para que los textos de abajo cuenten este array en vez
 * de llevar el número y los nombres escritos a mano, que es como se
 * desincronizan sin que nadie lo note.
 *
 * Los `id` son la clave que se guarda en la base (`inscripciones.categoria`):
 * cambiarlos con gente ya inscrita la desvincularía de su categoría. Los
 * `name` sí se pueden reescribir libremente.
 *
 * PENDIENTE: descripciones (edades y requisitos de cada una).
 */
const categories: Category[] = [
  { id: "infantil", name: "Infantil" },
  { id: "damas", name: "Damas" },
  { id: "novatos", name: "Novatos" },
  { id: "prejuvenil", name: "Prejuvenil" },
  { id: "rigidas", name: "Rígidas" },
  { id: "master", name: "Máster" },
  { id: "enduro", name: "Enduro" },
  { id: "juvenil", name: "Juvenil" },
  { id: "elite", name: "Élite" },
];

/**
 * "Nueve categorías, desde Infantil hasta Élite", derivado de la lista de
 * arriba. Editar `categories` actualiza esta frase donde aparezca; antes
 * había que acordarse de tocar tres textos a mano.
 */
const cuentaCategorias = contarFemenino(
  categories.length,
  "categoría",
  "categorías",
);

const resumenCategorias = `${capitalizar(cuentaCategorias)}, desde ${
  categories[0].name
} hasta ${categories[categories.length - 1].name}`;

const config: EventConfig = {
  slug: "downhill-la-cantera-2026",
  name: "Downhill Bella Vista 2026",
  tagline:
    "Carrera de MTB descenso en El Ángel, Carchi — sector Bella Vista.",

  club: {
    name: "Remnant EB",
    logo: { src: clubLogo, alt: "Logo del club Remnant EB" },
    socials: {
      // instagram: "https://instagram.com/...",
      // facebook: "https://facebook.com/...",
    },
  },

  date: {
    start: "2026-09-06",
    displayLabel: "Domingo 6 de septiembre de 2026",
  },

  location: {
    venue: "Sector Bella Vista",
    city: "El Ángel",
    province: "Carchi",
    country: "Ecuador",
    // PENDIENTE: coordenadas del graderío. Estas son las de El Ángel centro,
    // así que el JSON-LD y el "cómo llegar" apuntan al pueblo, no a la pista.
    coordinates: { lat: 0.6266, lng: -77.9364 },
    googleMapsUrl: "https://maps.google.com/?q=0.6266,-77.9364",
  },

  site: {
    // domain: "downhill.<dominio-ebcorp>", // se define al comprar el dominio
    // gaId: "G-XXXXXXX",
    themeColor: "#0a0a0a",
  },

  seo: {
    title: "Downhill Bella Vista 2026 — Carrera de MTB descenso en El Ángel",
    description: `Carrera de MTB descenso en El Ángel, Carchi: bajada única cronometrada hasta el sector del graderío de Bella Vista, con ${cuentaCategorias}. Organiza Remnant EB — domingo 6 de septiembre de 2026.`,
    keywords: [
      "downhill",
      "MTB",
      "descenso",
      "Bella Vista",
      "El Ángel",
      "Carchi",
      "Ecuador",
      "ciclismo",
    ],
    // PENDIENTE: afiche del evento (1200×630, <300 KB)
    ogImagePath: "/events/downhill-la-cantera-2026/og.png",
  },

  whatsapp: {
    phone: "593961699925",
    registrationMessage:
      "Hola, quiero inscribirme al Downhill Bella Vista 2026. Mi nombre es: ",
    // communityInviteUrl: "https://chat.whatsapp.com/...",
  },

  // Modo "modal" activo: requiere el proyecto Supabase configurado
  // (migraciones de supabase/migrations/ + variables de .env.example)
  registrationCta: {
    mode: "modal",
    label: "¡Inscríbete ya!",
    stickyLabel: "Inscríbete",
  },

  registrationForm: {
    fields: {
      cedula: true,
      ciudad: true,
      emergencyContact: true,
      clubTeam: true,
      // Carrera con categorías y dorsal: nada de placas
      categoria: true,
      placa: false,
      copiloto: false,
    },
    // El dorsal lo asigna el sistema al confirmar la inscripción
    identificador: { tipo: "dorsal", label: "Dorsal" },
    // 100 dorsales sorteados al azar, únicos en todo el evento (el 47 lo
    // lleva una sola persona, sin importar la categoría). Al agotarse no se
    // puede confirmar a nadie más, ni online ni en el mostrador.
    cupoDorsales: 100,
    comprobante: true,
    // Aviso al club por cada inscripción nueva. Ponlo en false si el
    // volumen amenaza el tope diario de Resend: el correo del participante
    // es el que no se puede perder. Requiere redesplegar.
    notificarOrganizador: true,
    privacyNote:
      "Tus datos se usan únicamente para la organización del evento y no se comparten con terceros.",
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

  categories,

  sections: {
    hero: {
      backgroundImage: {
        src: heroImage,
        alt: "Rider de MTB descendiendo hacia el graderío de Bella Vista",
      },
      showCountdown: true,
      secondaryCtaLabel: "Únete a la comunidad",
    },

    about: {
      paragraphs: [
        "Downhill Bella Vista 2026 es una carrera de descenso en El Ángel, Carchi. Una bajada de tierra rápida y técnica que termina en el sector del graderío, con saltos y obstáculos.",
        `Cada corredor tiene una sola bajada cronometrada para dejarlo todo. ${resumenCategorias}. Organiza Remnant EB.`,
      ],
      image: {
        src: aboutImage,
        alt: "Tramo de la bajada de Bella Vista",
      },
      highlights: [
        { label: "Bajada", value: "Única" },
        { label: "Categorías", value: String(categories.length) },
        { label: "Provincia", value: "Carchi" },
        { label: "Disciplina", value: "DH" },
      ],
    },

    categoriesSection: {
      intro: `${resumenCategorias}. Toda categoría exige casco integral y guantes; se recomienda protección completa.`,
    },

    route: {
      mode: "embed",
      // PENDIENTE: iframe de Google My Maps con la bajada dibujada
      embedUrl: "https://maps.google.com/maps?q=0.6266,-77.9364&z=15&output=embed",
      // PENDIENTE: distancia, desnivel y altitud reales de la bajada. Sin
      // datos no se muestran cifras: es preferible a publicar una inventada.
      stats: {},
      description:
        "Una bajada de tierra rápida y técnica que termina en el sector del graderío, con saltos y obstáculos. Se reconoce en la mañana y se corre en una sola bajada cronometrada.",
      images: [
        { src: track1, alt: "Tramo técnico de la bajada" },
        { src: track2, alt: "Salto en la parte baja del trazado" },
      ],
    },

    schedule: {
      days: [
        {
          dateLabel: "Domingo 6 de septiembre de 2026",
          items: [
            {
              time: "08:00",
              title: "Reconocimiento de pista",
              detail: "Hasta las 11:30.",
            },
            { time: "11:30", title: "Cierre de registro" },
            {
              time: "12:00",
              title: "Inicio del evento",
              detail: "Bajada única cronometrada.",
            },
            { time: "14:00", title: "Premiación" },
          ],
        },
      ],
    },

    pricing: {
      // PENDIENTE: qué incluye la inscripción (el campo `includes` se omite
      // mientras no esté definido; la tarjeta se ve bien sin él).
      items: [
        {
          label: "Inscripción · todas las categorías",
          price: "$15",
        },
      ],
      // Los datos bancarios NO van aquí: se muestran dentro del formulario de
      // inscripción y se editan en /admin/configuracion.
      paymentInfo: [
        "Transferencia o depósito: los datos de la cuenta aparecen al inscribirte.",
        "Se sube el comprobante en el mismo formulario.",
      ],
      deadlineLabel: "Registro abierto hasta las 11:30 del día del evento.",
    },

    // PENDIENTE: reglamento definitivo revisado por ti (y agregar pdfPath
    // cuando exista el PDF en public/events/downhill-la-cantera-2026/)
    rules: {
      items: [
        {
          title: "Equipo de protección obligatorio",
          body: "Casco integral, guantes cerrados y zapatillas firmes son obligatorios en entrenamientos y carrera. Se recomienda espaldar, rodilleras y coderas. Sin equipo completo no se permite largar.",
        },
        {
          title: "Estado de la bicicleta",
          body: "La bicicleta debe pasar revisión mecánica en el registro: frenos operativos en ambas ruedas, dirección firme y llantas en buen estado.",
        },
        {
          title: "Menores de edad",
          body: "Los menores de edad deben presentar autorización firmada por su representante legal al momento del registro.",
        },
        {
          title: "Reconocimiento de pista",
          body: "El reconocimiento es de 8:00 a 11:30 del día del evento. Es la única oportunidad de ver el trazado antes de la bajada cronometrada.",
        },
        {
          title: "Responsabilidad",
          body: "Cada corredor participa bajo su propia responsabilidad y firma un deslinde al inscribirse. La organización dispone de atención de primeros auxilios durante todo el evento.",
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

    // PENDIENTE: fotos reales de ediciones anteriores.
    // La lista sale de images/galeria.ts (la regenera `npm run fotos` con las
    // fotos que haya en la carpeta). Sin fotos, la sección no se renderiza.
    gallery:
      galeria.length > 0
        ? {
            images: galeria,
            // Videos de YouTube: se mezclan con las fotos en el mismo grid.
            // No se aloja nada aquí — la miniatura pesa ~10 KB y el
            // reproductor solo se carga al abrir el video. Sirve cualquier
            // forma del enlace: youtu.be/…, watch?v=…, /shorts/… o el id.
            // videos: [
            //   {
            //     youtube: "https://youtu.be/XXXXXXXXXXX",
            //     title: "Bajada ganadora, edición 2025",
            //   },
            //   // `position: 2` lo coloca tercero en el grid; sin eso, los
            //   // videos van antes que las fotos.
            // ],
            // instagramUrl: "https://instagram.com/...",
          }
        : undefined,

    contact: {
      organizers: [
        {
          name: "Byron Herrería",
          role: "Organizador — Remnant EB",
          phone: "593961699925",
        },
      ],
      // Correo del club. Es también el reply-to de los correos automáticos
      // del módulo de inscripciones (lib/email.ts).
      email: "remnant@ebcorp.dev",
      showCommunityCta: true,
    },
  },
};

export default config;
