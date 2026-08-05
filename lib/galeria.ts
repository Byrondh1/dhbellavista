import type { GallerySection, ImageAsset } from "./types";
import { youtubeEmbed, youtubeId, youtubeMiniatura } from "./youtube";
import { logWarn } from "./logger";

/**
 * Un elemento de la galería: foto local (optimizada por next/image, con su
 * blur) o video de YouTube (miniatura remota, reproductor bajo demanda).
 */
export type MedioGaleria =
  | { tipo: "foto"; imagen: ImageAsset }
  | { tipo: "video"; id: string; titulo: string; miniatura: string; embed: string };

/**
 * Mezcla fotos y videos en la lista que ve el grid.
 *
 * Orden: los videos van primero —son el contenido escaso y el badge de play
 * atrae el toque—, salvo los que declaren `position`, que se insertan en ese
 * índice exacto.
 */
export function mediosDeGaleria(section: GallerySection): MedioGaleria[] {
  const fotos: MedioGaleria[] = section.images.map((imagen) => ({
    tipo: "foto",
    imagen,
  }));

  const videos = (section.videos ?? []).flatMap((video) => {
    const id = youtubeId(video.youtube);
    if (!id) {
      // Se omite en vez de romper la página, pero queda dicho: un video que
      // no aparece sin explicación es peor que un aviso en el log.
      logWarn(
        `Galería: "${video.youtube}" no es un enlace de YouTube reconocible; el video se omite.`,
      );
      return [];
    }
    return [
      {
        medio: {
          tipo: "video" as const,
          id,
          titulo: video.title,
          miniatura: youtubeMiniatura(id),
          embed: youtubeEmbed(id),
        },
        position: video.position,
      },
    ];
  });

  const lista: MedioGaleria[] = [
    ...videos.filter((v) => v.position == null).map((v) => v.medio),
    ...fotos,
  ];

  // Los que piden posición se insertan después, de menor a mayor, para que
  // el índice que escribió cada uno signifique lo mismo que al leerlo
  for (const { medio, position } of videos
    .filter((v) => v.position != null)
    .sort((a, b) => a.position! - b.position!)) {
    lista.splice(Math.min(Math.max(position!, 0), lista.length), 0, medio);
  }

  return lista;
}

/** Texto accesible de cada elemento (alt de la foto o título del video) */
export function textoDelMedio(medio: MedioGaleria): string {
  return medio.tipo === "foto" ? medio.imagen.alt : medio.titulo;
}
