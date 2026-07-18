"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const GpxMap = dynamic(() => import("./GpxMap"), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

function MapPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="flex h-80 w-full items-center justify-center rounded-brand border border-border bg-surface text-sm text-muted sm:h-[28rem]"
    >
      Cargando mapa…
    </div>
  );
}

/**
 * Orquestador del mapa: decide entre iframe (Google My Maps) y Leaflet+GPX,
 * y en ambos casos difiere la carga hasta que la sección se acerca al
 * viewport para no penalizar la carga inicial en conexiones lentas.
 */
export function RouteMap({
  mode,
  embedUrl,
  gpxPath,
}: {
  mode: "embed" | "gpx";
  embedUrl?: string;
  gpxPath?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef}>
      {!nearViewport ? (
        <MapPlaceholder />
      ) : mode === "embed" && embedUrl ? (
        <iframe
          src={embedUrl}
          title="Mapa del recorrido"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          className="h-80 w-full rounded-brand border border-border sm:h-[28rem]"
        />
      ) : mode === "gpx" && gpxPath ? (
        <GpxMap gpxPath={gpxPath} />
      ) : null}
    </div>
  );
}
