"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

/**
 * Mapa interactivo del recorrido: Leaflet + OpenStreetMap (sin API key)
 * dibujando el track del archivo GPX. Este módulo se carga por dynamic
 * import solo en eventos con route.mode === "gpx" y solo cuando la
 * sección entra al viewport.
 */
export default function GpxMap({ gpxPath }: { gpxPath: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let map: import("leaflet").Map | undefined;

    (async () => {
      const L = (await import("leaflet")).default;
      const response = await fetch(gpxPath);
      const xml = new DOMParser().parseFromString(
        await response.text(),
        "application/xml",
      );
      const points = Array.from(xml.querySelectorAll("trkpt"))
        .map((pt) => [
          parseFloat(pt.getAttribute("lat") ?? ""),
          parseFloat(pt.getAttribute("lon") ?? ""),
        ])
        .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon)) as [
        number,
        number,
      ][];

      if (cancelled || points.length === 0) return;

      const brandColor =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--c-primary")
          .trim() || "#e11";

      map = L.map(container, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 17,
      }).addTo(map);

      const track = L.polyline(points, { color: brandColor, weight: 4 }).addTo(
        map,
      );
      L.circleMarker(points[0], {
        radius: 7,
        color: "#fff",
        fillColor: brandColor,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip("Salida");
      L.circleMarker(points[points.length - 1], {
        radius: 7,
        color: "#fff",
        fillColor: "#111",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip("Llegada");

      map.fitBounds(track.getBounds(), { padding: [24, 24] });
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [gpxPath]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Mapa interactivo del recorrido"
      className="z-0 h-80 w-full rounded-brand border border-border sm:h-[28rem]"
    />
  );
}
