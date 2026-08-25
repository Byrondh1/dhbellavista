/**
 * Lectura de tracks GPX y cálculo de pendientes.
 *
 * El GPX es la fuente de verdad del recorrido: cambiar el archivo cambia el
 * mapa, sin tocar código ni config. Por eso aquí no hay ninguna cifra escrita
 * a mano — distancia, caída y altitudes salen de los puntos.
 *
 * Todo es puro y sin DOM (recibe el XML ya parseado o el texto), para poder
 * comprobarlo fuera del navegador.
 */

export interface PuntoGpx {
  lat: number;
  lon: number;
  /** Metros sobre el nivel del mar. null si el punto no la trae */
  ele: number | null;
}

export interface TramoGpx {
  desde: PuntoGpx;
  hasta: PuntoGpx;
  /** Distancia horizontal en metros */
  distancia: number;
  /** Diferencia de altura: negativa en bajada */
  desnivel: number;
  /**
   * Pendiente como fracción (−0.18 = baja un 18 %). Cero si no hay altura o
   * si el tramo no avanza en horizontal.
   */
  pendiente: number;
}

/** Radio medio de la Tierra, en metros */
const RADIO_TIERRA = 6_371_008.8;

/** Distancia entre dos puntos por la fórmula del haversine, en metros */
export function distanciaEntre(a: PuntoGpx, b: PuntoGpx): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA * Math.asin(Math.sqrt(h));
}

/**
 * Extrae los puntos de un GPX. Acepta el texto o un documento ya parseado
 * (en el navegador conviene reutilizar el DOMParser nativo).
 *
 * Los puntos sin lat/lon usable se descartan en silencio: un archivo con una
 * línea rota debe dibujar el resto del trazado, no quedarse en blanco.
 */
export function parsearGpx(fuente: string | XMLDocument): PuntoGpx[] {
  const doc =
    typeof fuente === "string"
      ? new DOMParser().parseFromString(fuente, "application/xml")
      : fuente;

  return Array.from(doc.getElementsByTagName("trkpt"))
    .map((pt) => {
      const ele = pt.getElementsByTagName("ele")[0]?.textContent;
      const alt = ele ? Number.parseFloat(ele) : NaN;
      return {
        lat: Number.parseFloat(pt.getAttribute("lat") ?? ""),
        lon: Number.parseFloat(pt.getAttribute("lon") ?? ""),
        ele: Number.isFinite(alt) ? alt : null,
      };
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
}

/** Los tramos entre puntos consecutivos, con su pendiente */
export function tramosDe(puntos: readonly PuntoGpx[]): TramoGpx[] {
  const tramos: TramoGpx[] = [];
  for (let i = 0; i < puntos.length - 1; i++) {
    const desde = puntos[i];
    const hasta = puntos[i + 1];
    const distancia = distanciaEntre(desde, hasta);
    const desnivel =
      desde.ele !== null && hasta.ele !== null ? hasta.ele - desde.ele : 0;
    tramos.push({
      desde,
      hasta,
      distancia,
      desnivel,
      // Dos puntos en el mismo sitio darían una pendiente infinita
      pendiente: distancia > 0 ? desnivel / distancia : 0,
    });
  }
  return tramos;
}

/**
 * Escala de color por dureza del tramo: verde lo suave, rojo lo empinado,
 * pasando por lima, amarillo y naranja.
 *
 * Se mide la pendiente en valor absoluto, sin mirar el signo. En una bajada
 * eso es exactamente "qué tan fuerte es el descenso", porque todos los tramos
 * bajan; y deja el mismo componente sirviendo para una travesía de subida,
 * donde un 18 % es igual de duro aunque sea cuesta arriba. El sentido lo dice
 * el tooltip con una flecha, que es donde no puede confundirse.
 */
const ESCALA: { hasta: number; color: [number, number, number] }[] = [
  { hasta: 0.0, color: [34, 197, 94] }, // verde
  { hasta: 0.08, color: [132, 204, 22] }, // lima
  { hasta: 0.12, color: [234, 179, 8] }, // amarillo
  { hasta: 0.16, color: [249, 115, 22] }, // naranja
  { hasta: 0.22, color: [220, 38, 38] }, // rojo
];

function aHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

export function colorDePendiente(pendiente: number): string {
  const dureza = Math.abs(pendiente);

  if (dureza <= ESCALA[0].hasta) return aHex(ESCALA[0].color);
  const ultimo = ESCALA[ESCALA.length - 1];
  if (dureza >= ultimo.hasta) return aHex(ultimo.color);

  for (let i = 1; i < ESCALA.length; i++) {
    const bajo = ESCALA[i - 1];
    const alto = ESCALA[i];
    if (dureza <= alto.hasta) {
      const t = (dureza - bajo.hasta) / (alto.hasta - bajo.hasta);
      return aHex([
        bajo.color[0] + (alto.color[0] - bajo.color[0]) * t,
        bajo.color[1] + (alto.color[1] - bajo.color[1]) * t,
        bajo.color[2] + (alto.color[2] - bajo.color[2]) * t,
      ]);
    }
  }
  return aHex(ultimo.color);
}

/** Los tramos de referencia de la leyenda, de suave a empinado */
export const LEYENDA_PENDIENTE = [
  { etiqueta: "0–8 %", pendiente: -0.04 },
  { etiqueta: "8–12 %", pendiente: -0.1 },
  { etiqueta: "12–16 %", pendiente: -0.14 },
  { etiqueta: "16–22 %", pendiente: -0.19 },
  { etiqueta: "+22 %", pendiente: -0.25 },
];

export interface EstadisticasGpx {
  /** Distancia recorrida sobre el terreno, en km */
  distanciaKm: number;
  /** Metros perdidos en total (suma de los descensos), siempre positivo */
  caidaM: number;
  /** Altitud del primer punto */
  salidaM: number | null;
  /** Altitud del último punto */
  metaM: number | null;
}

/**
 * Las cifras del recorrido, derivadas de los puntos.
 *
 * `caidaM` suma solo los tramos que bajan: es lo que desciende el corredor,
 * no la resta entre salida y meta (que ignoraría cualquier repecho).
 */
export function estadisticasDe(puntos: readonly PuntoGpx[]): EstadisticasGpx {
  const tramos = tramosDe(puntos);
  const distancia = tramos.reduce((suma, t) => suma + t.distancia, 0);
  const caida = tramos.reduce(
    (suma, t) => (t.desnivel < 0 ? suma - t.desnivel : suma),
    0,
  );
  return {
    distanciaKm: distancia / 1000,
    caidaM: caida,
    salidaM: puntos[0]?.ele ?? null,
    metaM: puntos[puntos.length - 1]?.ele ?? null,
  };
}
