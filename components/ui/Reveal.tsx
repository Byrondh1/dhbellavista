"use client";

import { useEffect, useRef } from "react";

/**
 * Animación sutil de entrada al hacer scroll. El contenido es visible por
 * defecto (sin JS no se oculta nada); el ocultamiento solo aplica cuando
 * html[data-js] existe, y prefers-reduced-motion lo desactiva por CSS.
 */
export function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="reveal">
      {children}
    </div>
  );
}
