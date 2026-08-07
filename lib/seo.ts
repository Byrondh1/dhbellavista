import type { Metadata } from "next";
import type { EventConfig } from "./types";
import { getSiteUrl } from "./site-url";

/** Metadata base del evento (se enriquece con JSON-LD en la página) */
export function buildMetadata(config: EventConfig): Metadata {
  const siteUrl = getSiteUrl(config);
  const { title, description, ogImagePath, ogImageAlt, keywords } = config.seo;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    keywords,
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description,
      url: "/",
      siteName: config.name,
      locale: "es_EC",
      type: "website",
      ...(ogImagePath && {
        images: [
          {
            url: ogImagePath,
            width: 1200,
            height: 630,
            alt: ogImageAlt ?? config.name,
          },
        ],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImagePath && { images: [ogImagePath] }),
    },
  };
}
