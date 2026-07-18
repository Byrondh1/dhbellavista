import type { EventTheme } from "@/lib/types";

/**
 * Capa decorativa con la textura del evento (ej. banda de rodadura),
 * repetida como patrón de fondo. Se renderiza solo si el tema la define
 * para la zona indicada.
 */
export function TextureOverlay({
  theme,
  zone,
}: {
  theme: EventTheme;
  zone: "hero" | "footer";
}) {
  const texture = theme.texture;
  if (!texture || !texture.apply.includes(zone)) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `url(${texture.image.src.src})`,
        backgroundRepeat: "repeat",
        opacity: texture.opacity,
      }}
    />
  );
}
