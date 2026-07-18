import type { Metadata, Viewport } from "next";
import { Geist, Oswald, Archivo_Black } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { getActiveEvent } from "@/lib/event";
import { buildMetadata } from "@/lib/seo";
import { themeStyle } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
});

// Los archivos de fuente solo se descargan si el CSS renderizado los usa,
// así que declarar los tres presets no penaliza al evento que usa uno solo.
const HEADING_FONT_VAR: Record<string, string> = {
  condensed: "var(--font-oswald)",
  display: "var(--font-archivo-black)",
  default: "var(--font-geist-sans)",
};

const event = getActiveEvent();

export const metadata: Metadata = buildMetadata(event);

export const viewport: Viewport = {
  themeColor: event.site.themeColor,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const style = {
    ...themeStyle(event.theme),
    "--font-heading-active":
      HEADING_FONT_VAR[event.theme.fontHeading ?? "condensed"],
  } as React.CSSProperties;

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${oswald.variable} ${archivoBlack.variable} h-full antialiased`}
      style={style}
      suppressHydrationWarning
    >
      <head>
        {/* Marca que hay JS: las animaciones de scroll solo ocultan contenido
            cuando este atributo existe (sin JS la página queda visible) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.dataset.js = "1"`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        {children}
      </body>
      {event.site.gaId && process.env.NODE_ENV === "production" && (
        <GoogleAnalytics gaId={event.site.gaId} />
      )}
    </html>
  );
}
