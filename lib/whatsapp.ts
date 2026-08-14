import type { EventConfig } from "./types";

/** Construye un link wa.me con mensaje pre-llenado */
export function waLink(phone: string, message?: string): string {
  const base = `https://wa.me/${phone.replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * El número tal como se marca desde cualquier país: `tel:+593961699925`.
 * En el config se guarda sin el "+" (formato de wa.me), pero un enlace tel:
 * sin él se interpreta como número local y no sale del país.
 */
export function telLink(phone: string): string {
  return `tel:+${phone.replace(/\D/g, "")}`;
}

/**
 * El número para leerlo en pantalla: "+593 96 169 9925".
 *
 * Se muestra en formato internacional a propósito: El Ángel está en la
 * frontera y parte del público entra desde Colombia, donde el 09… local no
 * sirve. Solo se agrupa el celular ecuatoriano (593 + 9 dígitos); cualquier
 * otra longitud se devuelve con el "+" y sin inventar separaciones.
 */
export function telefonoVisible(phone: string): string {
  const d = phone.replace(/\D/g, "");
  const m = d.match(/^593(\d{2})(\d{3})(\d{4})$/);
  return m ? `+593 ${m[1]} ${m[2]} ${m[3]}` : `+${d}`;
}

/**
 * Normaliza un número tal como lo escribió el participante y devuelve el
 * formato que pide wa.me: solo dígitos, con código de país al frente.
 *
 * En el formulario la gente escribe de todo: "0987654321", "+593 98 765 4321",
 * "00593...". Esto lo unifica.
 *
 * `pais` mira a Colombia porque parte del público entra desde Ipiales y
 * Tulcán. Hoy la tabla de inscripciones no guarda país, así que llega
 * undefined y se asume Ecuador; el día que se agregue esa columna, basta
 * pasarla aquí.
 */
export function toWhatsApp(raw: string, pais?: string | null): string {
  let n = raw.replace(/\D/g, "");

  // Prefijo internacional marcado a la antigua
  if (n.startsWith("00")) n = n.slice(2);

  // Ya viene con código de país: no se toca
  if (n.startsWith("593") || n.startsWith("57")) return n;

  // El 0 del formato nacional no va en el internacional
  if (n.startsWith("0")) n = n.slice(1);

  const codigo = pais?.trim().toLowerCase() === "colombia" ? "57" : "593";
  return `${codigo}${n}`;
}

/**
 * La fecha del evento tal como se lee dentro de una frase:
 * "sábado 5 de septiembre".
 *
 * Sale de `date.start`, que es la fecha real del evento y la única fuente de
 * verdad. Se formatea en UTC a propósito: `start` es un día sin hora, y
 * dejarlo al huso del servidor lo correría al día anterior en cualquier zona
 * al oeste de Greenwich — Ecuador, sin ir más lejos.
 */
function fechaEnFrase(isoDate: string): string | null {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  })
    .format(d)
    // es-EC mete una coma tras el día de la semana que sobra dentro de la frase
    .replace(",", "");
}

/**
 * El mensaje que la organización manda al participante desde el panel, con
 * sus marcadores resueltos.
 *
 * `{date}` se sustituye por la fecha del evento para que el texto no pueda
 * quedar desfasado del config. Hora y lugar van escritos en el mensaje: son
 * datos de la salida, no del evento, y no tienen un campo propio.
 *
 * Devuelve undefined si el evento no configuró mensaje — el enlace abre
 * entonces el chat en blanco.
 */
export function mensajeConfirmacion(event: EventConfig): string | undefined {
  const plantilla = event.whatsapp.confirmationMessage;
  if (!plantilla) return undefined;
  const fecha = fechaEnFrase(event.date.start);
  // Sin fecha utilizable se deja el marcador sin resolver antes que escribir
  // una fecha inventada: se nota al instante y se corrige.
  return fecha ? plantilla.replaceAll("{date}", fecha) : plantilla;
}
