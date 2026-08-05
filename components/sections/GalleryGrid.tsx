"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type MedioGaleria, textoDelMedio } from "@/lib/galeria";

/**
 * Grid de fotos y videos con lightbox propio (sin dependencias externas).
 *
 * El lightbox va en un portal a <body> para que ningún contenedor con
 * overflow o z-index propio lo recorte, atrapa el foco mientras está abierto,
 * y solo monta el reproductor de YouTube del elemento actual: al navegar a
 * otro, el iframe se desmonta y el video se detiene solo.
 */
export function GalleryGrid({ medios }: { medios: MedioGaleria[] }) {
  const [abierto, setAbierto] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  /** Miniatura desde la que se abrió, para devolverle el foco al cerrar */
  const origenRef = useRef<HTMLButtonElement | null>(null);

  const cerrar = useCallback(() => {
    setAbierto(null);
    origenRef.current?.focus();
  }, []);

  const hayAnterior = abierto !== null && abierto > 0;
  const haySiguiente = abierto !== null && abierto < medios.length - 1;
  const anterior = useCallback(() => {
    setAbierto((i) => (i !== null && i > 0 ? i - 1 : i));
  }, []);
  const siguiente = useCallback(() => {
    setAbierto((i) => (i !== null && i < medios.length - 1 ? i + 1 : i));
  }, [medios.length]);

  useEffect(() => {
    if (abierto === null) return;
    cerrarRef.current?.focus();
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") return cerrar();
      if (e.key === "ArrowLeft") return anterior();
      if (e.key === "ArrowRight") return siguiente();
      if (e.key !== "Tab") return;
      // Trampa de foco: sin esto el tabulador se escapa a la página de atrás,
      // que sigue ahí aunque no se vea.
      const focusables = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], iframe, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusables.length === 0) return;
      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [abierto, cerrar, anterior, siguiente]);

  const actual = abierto === null ? null : medios[abierto];

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {medios.map((medio, i) => (
          <li key={medio.tipo === "foto" ? `f${i}` : `v${medio.id}`}>
            <button
              type="button"
              onClick={(e) => {
                origenRef.current = e.currentTarget;
                setAbierto(i);
              }}
              aria-label={
                medio.tipo === "foto"
                  ? `Ampliar foto: ${medio.imagen.alt}`
                  : `Reproducir video: ${medio.titulo}`
              }
              className="group relative block w-full overflow-hidden rounded-brand border border-border"
            >
              {medio.tipo === "foto" ? (
                <Image
                  src={medio.imagen.src}
                  alt={medio.imagen.alt}
                  placeholder="blur"
                  sizes="(min-width: 640px) 33vw, 50vw"
                  className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <>
                  {/* Miniatura remota de YouTube: no pasa por el optimizador de
                      Next a propósito — ya viene en el tamaño justo (320×180,
                      ~10 KB) y así no gasta transformaciones de imagen. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={medio.miniatura}
                    alt=""
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
                  />
                  <IconoPlay />
                  <span className="absolute inset-x-0 bottom-0 p-3 text-left text-xs font-semibold text-white">
                    {medio.titulo}
                  </span>
                </>
              )}
            </button>
          </li>
        ))}
      </ul>

      {actual !== null &&
        abierto !== null &&
        createPortal(
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={textoDelMedio(actual)}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            onClick={cerrar}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />

            {/* stopPropagation para que tocar el contenido no cierre */}
            <div
              className="absolute inset-0 z-10 flex items-center justify-center px-4 py-20 sm:px-20"
              onClick={(e) => e.stopPropagation()}
            >
              {actual.tipo === "foto" ? (
                <Image
                  key={`f${abierto}`}
                  src={actual.imagen.src}
                  alt={actual.imagen.alt}
                  sizes="100vw"
                  className="animate-lb-in max-h-[75svh] w-auto rounded-brand object-contain"
                />
              ) : (
                <div className="animate-lb-in aspect-video w-full max-w-4xl overflow-hidden rounded-brand bg-black">
                  <iframe
                    key={actual.id}
                    src={actual.embed}
                    title={actual.titulo}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="h-full w-full border-0"
                  />
                </div>
              )}
            </div>

            <button
              ref={cerrarRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cerrar();
              }}
              aria-label="Cerrar galería"
              className="absolute top-4 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/70 text-2xl leading-none text-white hover:border-primary hover:text-primary"
            >
              ×
            </button>

            <p className="pointer-events-none absolute top-5 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/20 bg-black/70 px-4 py-1.5 text-xs text-white/80">
              <span className="font-semibold text-primary">{abierto + 1}</span>
              {" / "}
              {medios.length}
            </p>

            {hayAnterior && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  anterior();
                }}
                aria-label="Anterior"
                className="absolute top-1/2 left-2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/70 text-2xl leading-none text-white hover:border-primary hover:text-primary sm:left-4"
              >
                ‹
              </button>
            )}
            {haySiguiente && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  siguiente();
                }}
                aria-label="Siguiente"
                className="absolute top-1/2 right-2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/70 text-2xl leading-none text-white hover:border-primary hover:text-primary sm:right-4"
              >
                ›
              </button>
            )}

            {/* Tira de miniaturas: en el celular se desplaza en horizontal */}
            {medios.length > 1 && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-x-0 bottom-3 z-20 flex justify-start gap-2 overflow-x-auto px-4 sm:justify-center"
              >
                {medios.map((medio, i) => (
                  <button
                    key={medio.tipo === "foto" ? `tf${i}` : `tv${medio.id}`}
                    type="button"
                    onClick={() => setAbierto(i)}
                    aria-label={`Ver ${i + 1} de ${medios.length}: ${textoDelMedio(medio)}`}
                    aria-current={i === abierto}
                    className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-brand ring-2 ${
                      i === abierto
                        ? "ring-primary"
                        : "opacity-60 ring-white/30 hover:opacity-100"
                    }`}
                  >
                    {medio.tipo === "foto" ? (
                      <Image
                        src={medio.imagen.src}
                        alt=""
                        sizes="48px"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={medio.miniatura}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        <IconoPlay pequeno />
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

/** Badge de reproducción, en el color de marca del evento */
function IconoPlay({ pequeno = false }: { pequeno?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center"
    >
      <span
        className={`flex items-center justify-center rounded-full bg-primary text-primary-contrast ${
          pequeno ? "h-6 w-6" : "h-12 w-12"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={pequeno ? "ml-0.5 h-3 w-3" : "ml-1 h-5 w-5"}
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </span>
  );
}
