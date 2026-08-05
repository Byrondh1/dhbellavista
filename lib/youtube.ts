/**
 * Enlaces de YouTube para la galería.
 *
 * El video NO se aloja en el sitio: la miniatura viene de i.ytimg.com y el
 * reproductor solo se monta cuando alguien abre ese elemento en el lightbox.
 * Al cargar la página no se pide un solo byte a YouTube.
 */

/** Un id de YouTube son 11 caracteres de este alfabeto */
const ID = /^[A-Za-z0-9_-]{11}$/;

function soloId(valor: string): string | null {
  const id = valor.split(/[?&#/]/)[0];
  return ID.test(id) ? id : null;
}

/**
 * Extrae el id de cualquiera de las formas en que YouTube comparte un video
 * (youtu.be, watch?v=, /shorts/, /embed/, /live/) o del id pelado.
 * Devuelve null si no se reconoce: quien llama decide qué hacer.
 */
export function youtubeId(entrada: string): string | null {
  const valor = entrada.trim();
  if (ID.test(valor)) return valor;

  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") return soloId(url.pathname.slice(1));
  if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    const v = url.searchParams.get("v");
    if (v) return soloId(v);
    const ruta = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
    if (ruta) return soloId(ruta[1]);
  }
  return null;
}

/**
 * Miniatura del video. `mqdefault` (320×180) es la única que existe siempre
 * en 16:9 de verdad: `hqdefault` viene en 4:3 con bandas negras y
 * `maxresdefault` no está en todos los videos. Pesa ~10 KB, que es lo que
 * corresponde para una celda de ~190 px en el celular.
 */
export function youtubeMiniatura(id: string): string {
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}

/**
 * URL del reproductor. `youtube-nocookie.com` no deja cookies de seguimiento
 * hasta que la persona le da play.
 */
export function youtubeEmbed(id: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    rel: "0", // sugerencias solo del mismo canal al terminar
    modestbranding: "1",
    playsinline: "1",
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}
