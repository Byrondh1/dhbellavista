import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy de la plantilla. Cada directiva permite solo lo
 * que el sitio realmente usa; si se agrega un servicio externo nuevo
 * (otro mapa, otro proveedor de formularios), hay que sumarlo aquí.
 */
const csp = [
  `default-src 'self'`,
  // 'unsafe-inline' es necesario para los scripts inline de Next (hidratación,
  // JSON-LD y el marcador data-js). En dev, Turbopack además requiere eval.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com`,
  // Estilos inline: los usan Next (fuentes/critical CSS), Tailwind y Leaflet
  `style-src 'self' 'unsafe-inline'`,
  // data:/blob: para los blur placeholders de next/image;
  // OpenStreetMap para los tiles del mapa GPX; Google para píxeles de GA;
  // Supabase para las URLs firmadas de comprobantes en el panel admin
  `img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://*.google-analytics.com https://*.googletagmanager.com https://*.supabase.co https://i.ytimg.com`,
  // next/font sirve las fuentes desde el propio dominio
  `font-src 'self'`,
  // GA4 (mediciones), Supabase (login/sesión del admin) y HMR de dev
  `connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.supabase.co${isDev ? " ws:" : ""}`,
  // Iframes embebidos: Google Maps / My Maps (mapa "embed") y Google Forms
  // (posible formulario embebido). maps.google.com redirige a www.google.com,
  // por eso van ambos.
  `frame-src https://www.google.com https://maps.google.com https://docs.google.com https://www.youtube-nocookie.com`,
  // Destinos permitidos para envío de formularios (Formspree como opción futura)
  `form-action 'self' https://formspree.io`,
  `object-src 'none'`,
  `base-uri 'self'`,
  // Nadie puede meter ESTE sitio en un iframe (anti-clickjacking)
  `frame-ancestors 'none'`,
  ...(isDev ? [] : [`upgrade-insecure-requests`]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // HSTS: forzar HTTPS 2 años, incluyendo subdominios. Vercel ya lo envía en
  // *.vercel.app; esto lo garantiza también en los dominios propios.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Redundante con frame-ancestors, pero cubre navegadores viejos
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // El sitio no usa cámara, micrófono ni geolocalización
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
