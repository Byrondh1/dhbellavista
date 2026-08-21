import type { StaticImageData } from "next/image";

/** Imagen importada estáticamente: Next infiere dimensiones y genera placeholder */
export interface ImageAsset {
  src: StaticImageData;
  alt: string;
}

export interface EventTheme {
  colors: {
    /** Color de marca del club (botones, acentos, títulos) */
    primary: string;
    /** Color del texto sobre `primary` */
    primaryContrast: string;
    /** Fondo general de la página */
    background: string;
    /** Fondo de tarjetas y paneles, un paso sobre `background` */
    surface: string;
    /** Texto principal */
    text: string;
    /** Texto secundario */
    textMuted: string;
    /** Bordes y separadores */
    border: string;
  };
  /** Textura decorativa de fondo (ej. banda de rodadura) */
  texture?: {
    image: ImageAsset;
    /** 0–1, mantener sutil */
    opacity: number;
    apply: ("hero" | "footer")[];
  };
  /** Preset tipográfico para títulos */
  fontHeading?: "condensed" | "display" | "default";
  /** Personalidad de las esquinas: 'sharp' para agresivo, 'rounded' para amable */
  radius?: "sharp" | "rounded";
}

export interface Category {
  /** Identificador estable; se usa como value en el select de inscripción */
  id: string;
  name: string;
  description?: string;
  /** Edad, equipo obligatorio, requisitos del vehículo, etc. */
  requirements?: string;
}

/**
 * Cómo se inscribe la gente. "whatsapp" abre wa.me con mensaje pre-llenado.
 * "modal" queda reservado para el futuro módulo propio de inscripciones
 * (formulario + Supabase + comprobante + correos): al implementarlo, todos
 * los CTAs del sitio (hero, sticky, costos) cambiarán de comportamiento
 * con solo editar este campo — los componentes ya lo consultan.
 */
export type RegistrationCtaMode = "whatsapp" | "modal";

export interface RegistrationCta {
  mode: RegistrationCtaMode;
  /** CTA principal (hero), ej. "¡Inscríbete ya!" */
  label: string;
  /** Texto del botón sticky flotante (por defecto usa `label`) */
  stickyLabel?: string;
}

export interface HeroSection {
  backgroundImage: ImageAsset;
  showCountdown?: boolean;
  /** CTA secundario: link a la comunidad de WhatsApp (requiere communityInviteUrl) */
  secondaryCtaLabel?: string;
}

export interface AboutSection {
  title?: string;
  paragraphs: string[];
  image?: ImageAsset;
  /** Cifras destacadas, ej. { label: "Edición", value: "3ra" } */
  highlights?: { label: string; value: string }[];
}

export interface CategoriesSection {
  title?: string;
  intro?: string;
}

export interface RouteSection {
  mode: "embed" | "gpx";
  /** URL de iframe de Google My Maps (modo embed) */
  embedUrl?: string;
  /** Ruta pública al GPX, ej. "/events/<slug>/recorrido.gpx" (modo gpx) */
  gpxPath?: string;
  stats: {
    distanceKm?: number;
    /** Desnivel acumulado en metros (positivo o de pérdida en descenso) */
    elevationGainM?: number;
    maxAltitudeM?: number;
    difficulty?: string;
  };
  description: string;
  /** Muestra botón de descarga del GPX (requiere gpxPath) */
  allowGpxDownload?: boolean;
  /** Fotos o perfil de la pista */
  images?: ImageAsset[];
}

export interface ScheduleSection {
  days: {
    /** Ej. "Sábado 12 de septiembre" */
    dateLabel: string;
    items: { time: string; title: string; detail?: string }[];
  }[];
}

export interface PricingSection {
  items: { label: string; price: string; includes?: string[]; note?: string }[];
  /** Banco, número de cuenta, efectivo, etc. */
  paymentInfo?: string[];
  deadlineLabel?: string;
}


/**
 * Cómo se identifica a cada inscrito.
 * - "dorsal": número que asigna el sistema al confirmar la inscripción, único
 *   en todo el evento (downhill). Ver `cupoDorsales` para cómo se elige.
 * - "placa": dato que trae el participante en el formulario; la placa del
 *   vehículo hace de código de inscripción (rodada 4x4).
 */
export type TipoIdentificador = "dorsal" | "placa";

export interface Identificador {
  tipo: TipoIdentificador;
  /** Etiqueta visible, ej. "Dorsal" o "Placa del vehículo" */
  label: string;
}

/**
 * Formulario del módulo propio de inscripciones (modal). Se usa cuando
 * registrationCta.mode === "modal". Los datos van a Supabase vía
 * /api/inscripciones (ver docs/modulo-inscripciones.md).
 */
export interface RegistrationFormConfig {
  /** Campos activos además de los siempre presentes (nombre, correo, teléfono) */
  fields: {
    cedula: boolean;
    ciudad: boolean;
    emergencyContact: boolean;
    /** Campo "club o equipo" (siempre opcional para el usuario) */
    clubTeam: boolean;
    /**
     * Select de categoría. false = el evento no clasifica (la rodada 4x4 no
     * tiene categorías). La lista `categories` del config puede seguir
     * existiendo para la sección pública: este flag solo controla el
     * formulario.
     */
    categoria: boolean;
    /** Placa del vehículo, obligatoria cuando está activa */
    placa: boolean;
    /**
     * Nombre del copiloto, opcional para el usuario. Lleno = el vehículo va
     * con dos personas (sirve para calcular kits de alimentación).
     */
    copiloto: boolean;
  };
  /**
   * Cómo se identifica cada inscripción el día del evento. Lo consumen el
   * PDF, los correos, el QR, el panel y la acreditación a través de
   * lib/identificador.ts — ningún componente decide esto por su cuenta.
   */
  identificador: Identificador;
  /** Pedir comprobante de transferencia (imagen o PDF) */
  comprobante: boolean;
  /**
   * Cupo duro de dorsales. Definido, el dorsal se SORTEA entre 1 y este
   * número; al agotarse no se puede confirmar a nadie más. Sin definir, el
   * dorsal es secuencial (max+1). En los dos casos es único en todo el
   * evento: desde la migración 0010 el mismo número no se repite entre
   * categorías.
   *
   * Lo aplica verificar_inscripcion tanto al confirmar un pago online como al
   * alta presencial: el sorteo vive en un solo sitio.
   */
  cupoDorsales?: number;
  /**
   * Avisar por correo al club cada vez que entra una inscripción. Va al
   * correo de `sections.contact.email`; sin ese correo no se envía nada.
   *
   * Sin definir se asume `true`. Se apaga cuando el volumen de inscripciones
   * amenace el tope diario de Resend: el aviso al organizador es prescindible
   * (el panel tiene la misma información), el correo del participante no.
   * OJO: cambiarlo exige redesplegar, como cualquier valor del config.
   */
  notificarOrganizador?: boolean;
  /**
   * Candado de código: cierra las inscripciones aunque el panel las tenga
   * abiertas, y sin depender de la base. Para el día a día NO se usa esto —
   * se cierra desde /admin/configuracion (tabla evento_datos_pago), que surte
   * efecto sin redesplegar. Déjalo sin definir salvo que quieras un cierre
   * que nadie pueda revertir desde el panel.
   */
  closed?: boolean;
  /** Aviso de uso de datos personales (importante: se recoge cédula) */
  privacyNote?: string;
  /**
   * Texto del consentimiento LOPDP que acepta el checkbox obligatorio.
   * Si se omite se usa DEFAULT_CONSENT_TEXT (lib/registration-schema.ts).
   * Se persiste con cada inscripción como evidencia de la versión aceptada.
   */
  consentText?: string;
}

export interface RulesSection {
  items: { title: string; body: string }[];
  /** Ruta pública al reglamento, ej. "/events/<slug>/reglamento.pdf" */
  pdfPath?: string;
}

export type SponsorTier = "oro" | "plata" | "bronce" | "colaborador";

export interface SponsorsSection {
  tiers: {
    tier: SponsorTier;
    sponsors: { name: string; logo: ImageAsset; url?: string }[];
  }[];
}

/**
 * Video de la galería, embebido desde YouTube. No se aloja nada en el sitio:
 * el peso lo carga YouTube, y solo cuando alguien lo abre.
 */
export interface GalleryVideo {
  /**
   * Enlace en cualquiera de sus formas (youtu.be/…, watch?v=…, /shorts/…)
   * o el id pelado. Un enlace irreconocible se omite con un aviso en consola.
   */
  youtube: string;
  /** Título bajo la miniatura; también es el texto accesible del botón */
  title: string;
  /**
   * Posición exacta en el grid (0 = primero). Sin definir, los videos van
   * antes que las fotos.
   */
  position?: number;
}

export interface GallerySection {
  images: ImageAsset[];
  /** Videos de YouTube, mezclados con las fotos en el mismo grid */
  videos?: GalleryVideo[];
  /** Link "ver más" hacia Instagram u otra red */
  instagramUrl?: string;
}

export interface ContactSection {
  organizers: { name: string; role?: string; phone?: string }[];
  email?: string;
  showCommunityCta?: boolean;
}

export interface EventConfig {
  /** Debe coincidir con la carpeta en content/events/ y con NEXT_PUBLIC_EVENT */
  slug: string;
  name: string;
  tagline?: string;
  club: {
    name: string;
    logo: ImageAsset;
    socials?: { instagram?: string; facebook?: string; tiktok?: string };
  };
  date: {
    /** ISO 8601, ej. "2026-09-12" — alimenta JSON-LD y countdown */
    start: string;
    end?: string;
    /** Lo que ve la gente, ej. "12 y 13 de septiembre, 2026" */
    displayLabel: string;
  };
  location: {
    venue: string;
    city: string;
    province: string;
    country: string;
    /** Link "cómo llegar" */
    googleMapsUrl?: string;
    /** Para el JSON-LD (rich results de Google) */
    coordinates?: { lat: number; lng: number };
  };
  site: {
    /** Dominio de producción; NEXT_PUBLIC_SITE_URL tiene prioridad */
    domain?: string;
    /** ID de Google Analytics 4, ej. "G-XXXXXXX" */
    gaId?: string;
    /** <meta name="theme-color"> para la barra del navegador móvil */
    themeColor: string;
  };
  seo: {
    title: string;
    description: string;
    /** Ruta pública, ej. "/events/<slug>/og.jpg" (1200×630, <300 KB) */
    ogImagePath?: string;
    /**
     * Texto alternativo del OG. Sin definir se usa el nombre del evento, que
     * es lo correcto cuando el afiche solo lleva ese nombre; se define cuando
     * la imagen dice algo más que conviene describir.
     */
    ogImageAlt?: string;
    keywords?: string[];
  };
  whatsapp: {
    /** Formato internacional sin "+", ej. "593987654321" */
    phone: string;
    /** Texto pre-llenado del wa.me de inscripción */
    registrationMessage: string;
    /**
     * Mensaje que la organización le manda al participante desde el panel,
     * tocando su teléfono. Va en el config y no en el componente porque el
     * panel es el mismo para los dos eventos.
     *
     * Sin definir, el enlace abre el chat sin texto pre-llenado.
     *
     * Admite el marcador `{date}`, que se sustituye por la fecha del evento
     * (derivada de `date.start`) para que el texto no pueda quedar desfasado.
     * Lo resuelve `mensajeConfirmacion()` en lib/whatsapp.ts.
     */
    confirmationMessage?: string;
    /** Link de invitación al grupo/comunidad del evento */
    communityInviteUrl?: string;
  };
  /** CTA de inscripción usado por hero, botón sticky y sección de costos */
  registrationCta: RegistrationCta;
  /** Requerido cuando registrationCta.mode === "modal" */
  registrationForm?: RegistrationFormConfig;
  theme: EventTheme;
  /**
   * Categorías del evento: alimentan la sección pública y, si
   * `registrationForm.fields.categoria` está activo, el select del
   * formulario. Un evento puede mostrarlas sin clasificar a los inscritos
   * (la rodada las usa como "modalidades" informativas).
   */
  categories: Category[];
  /** Sección presente = se renderiza; undefined = no aparece */
  sections: {
    hero: HeroSection;
    about?: AboutSection;
    categoriesSection?: CategoriesSection;
    route?: RouteSection;
    schedule?: ScheduleSection;
    pricing?: PricingSection;
    rules?: RulesSection;
    sponsors?: SponsorsSection;
    gallery?: GallerySection;
    contact?: ContactSection;
  };
}
