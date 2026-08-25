"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import {
  colorDePendiente,
  parsearGpx,
  tramosDe,
  type PuntoGpx,
} from "@/lib/gpx";

/**
 * Mapa del recorrido: Leaflet + OpenStreetMap, sin API key ni tarjeta.
 *
 * El trazado se pinta tramo a tramo COLOREADO POR PENDIENTE, que es lo que un
 * corredor quiere saber mirando el mapa: dónde se pone fea la bajada. Verde lo
 * suave, rojo lo empinado.
 *
 * Este módulo se carga por dynamic import con ssr:false (ver RouteMap): Leaflet
 * toca `window` al importarse y tumbaría el build del servidor. No usa los
 * íconos por defecto de Leaflet —que llegan rotos con cualquier bundler porque
 * resuelven rutas de imagen relativas al CSS— sino divIcon con marcado propio.
 */
export default function GpxMap({ gpxPath }: { gpxPath: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "sin-trazado">(
    "cargando",
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelado = false;
    let map: import("leaflet").Map | undefined;

    (async () => {
      const L = (await import("leaflet")).default;

      let puntos: PuntoGpx[] = [];
      try {
        const respuesta = await fetch(gpxPath);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        puntos = parsearGpx(await respuesta.text());
      } catch (error) {
        console.error(`No se pudo leer el GPX (${gpxPath}):`, error);
      }

      if (cancelado) return;
      if (puntos.length < 2) {
        setEstado("sin-trazado");
        return;
      }

      map = L.map(container, {
        // El scroll de la página no debe secuestrarse al pasar por el mapa;
        // en el móvil el pellizco sigue funcionando igual.
        scrollWheelZoom: false,
        // Zoom fraccionario. Por defecto Leaflet lo redondea a enteros, y
        // como la bajada mide menos de 2 km eso obligaba a fitBounds a bajar
        // un nivel entero: la ruta quedaba a media escala en medio del mapa.
        // Los botones + / − siguen moviéndose de uno en uno (zoomDelta).
        zoomSnap: 0,
        zoomDelta: 1,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      // Una línea oscura por debajo: sobre el mapa claro de OSM, los verdes y
      // amarillos del degradado se pierden sin ese contorno.
      const trazado = puntos.map((p) => [p.lat, p.lon] as [number, number]);
      L.polyline(trazado, {
        color: "#0a0a0a",
        weight: 9,
        opacity: 0.45,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Un segmento por tramo, cada uno con el color de su pendiente
      for (const tramo of tramosDe(puntos)) {
        L.polyline(
          [
            [tramo.desde.lat, tramo.desde.lon],
            [tramo.hasta.lat, tramo.hasta.lon],
          ],
          {
            color: colorDePendiente(tramo.pendiente),
            weight: 5,
            opacity: 1,
            lineCap: "round",
          },
        )
          .addTo(map)
          .bindTooltip(
            // La flecha dice el sentido: el color solo dice la dureza
            `${tramo.desnivel < 0 ? "▼" : "▲"} ${(
              Math.abs(tramo.pendiente) * 100
            ).toFixed(0)} % · ${tramo.desde.ele ?? "?"} m`,
            { sticky: true },
          );
      }

      const salida = puntos[0];
      const meta = puntos[puntos.length - 1];
      marcador(L, map, salida, "#16a34a", "Salida", salida.ele);
      marcador(L, map, meta, "#dc2626", "Meta", meta.ele);

      // Más aire arriba que abajo: los rótulos de Salida y Meta se dibujan
      // por encima de su marcador y contra el borde superior se recortaban.
      map.fitBounds(L.latLngBounds(trazado), {
        paddingTopLeft: [30, 54],
        paddingBottomRight: [30, 30],
      });
      setEstado("listo");
    })();

    return () => {
      cancelado = true;
      map?.remove();
    };
  }, [gpxPath]);

  if (estado === "sin-trazado") {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-brand border border-border bg-surface p-6 text-center text-sm text-muted sm:h-[28rem]">
        El trazado todavía no está publicado. Lo subimos aquí en cuanto esté
        medido.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Mapa interactivo del recorrido, coloreado por pendiente"
      className="z-0 h-80 w-full rounded-brand border border-border sm:h-[28rem]"
    />
  );
}

/**
 * Marcador de salida o meta. divIcon en vez del ícono por defecto: el PNG de
 * Leaflet se rompe al pasar por un bundler, y así además el pin va del color
 * que le toca sin cargar ninguna imagen.
 */
function marcador(
  L: typeof import("leaflet"),
  map: import("leaflet").Map,
  punto: PuntoGpx,
  color: string,
  etiqueta: string,
  altura: number | null,
) {
  L.marker([punto.lat, punto.lon], {
    icon: L.divIcon({
      className: "",
      html:
        `<span style="display:block;width:18px;height:18px;border-radius:9999px;` +
        `background:${color};border:3px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.5)"></span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    }),
    title: etiqueta,
    alt: etiqueta,
  })
    .addTo(map)
    .bindTooltip(altura !== null ? `${etiqueta} · ${altura} m` : etiqueta, {
      permanent: true,
      direction: "top",
      offset: [0, -10],
      className: "recorrido-tooltip",
    });
}
