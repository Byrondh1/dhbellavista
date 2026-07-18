"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageAsset } from "@/lib/types";

/** Grid de fotos con lightbox propio (sin dependencias externas) */
export function GalleryGrid({ images }: { images: ImageAsset[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpenIndex((current) =>
        current === null
          ? null
          : (current + delta + images.length) % images.length,
      ),
    [images.length],
  );

  useEffect(() => {
    if (openIndex === null) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openIndex, close, step]);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((image, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              aria-label={`Ampliar foto: ${image.alt}`}
              className="block w-full overflow-hidden rounded-brand border border-border"
            >
              <Image
                src={image.src}
                alt={image.alt}
                placeholder="blur"
                sizes="(min-width: 640px) 33vw, 50vw"
                className="aspect-[4/3] w-full object-cover transition-transform hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      {openIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={images[openIndex].alt}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={close}
        >
          <div
            className="relative max-h-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[openIndex].src}
              alt={images[openIndex].alt}
              sizes="100vw"
              className="max-h-[80svh] w-auto rounded-brand object-contain"
            />
            <p className="mt-3 text-center text-sm text-white/80">
              {images[openIndex].alt} · {openIndex + 1}/{images.length}
            </p>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={close}
              aria-label="Cerrar galería"
              className="absolute -top-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-contrast"
            >
              ×
            </button>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-xl text-white"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Foto siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-xl text-white"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </>
  );
}
