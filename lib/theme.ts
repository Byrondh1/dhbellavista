import type { CSSProperties } from "react";
import type { EventTheme } from "./types";

/**
 * Convierte la paleta del evento en CSS custom properties que se inyectan
 * en <html>. globals.css las mapea a utilidades de Tailwind vía @theme inline,
 * así los componentes solo usan clases semánticas (bg-primary, text-muted…).
 */
export function themeStyle(theme: EventTheme): CSSProperties {
  const c = theme.colors;
  return {
    "--c-primary": c.primary,
    "--c-primary-contrast": c.primaryContrast,
    "--c-background": c.background,
    "--c-surface": c.surface,
    "--c-text": c.text,
    "--c-text-muted": c.textMuted,
    "--c-border": c.border,
    "--radius-brand": theme.radius === "rounded" ? "0.75rem" : "0.125rem",
  } as CSSProperties;
}
