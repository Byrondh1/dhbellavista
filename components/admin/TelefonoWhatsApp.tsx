import { toWhatsApp, waLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";

/**
 * El teléfono del participante como enlace de "click to chat".
 *
 * El número se normaliza al vuelo (la gente lo escribe como quiere) y el
 * mensaje sale del config del evento, porque este panel lo comparten los dos
 * sitios. Sin `mensaje` el enlace abre el chat en blanco, que sigue siendo
 * mejor que copiar el número a mano.
 *
 * `pais` está de paso: hoy la tabla no lo guarda y se asume Ecuador.
 */
export function TelefonoWhatsApp({
  telefono,
  nombre,
  mensaje,
  pais,
}: {
  telefono: string;
  /** Personaliza el saludo cuando se conoce a quién se escribe */
  nombre?: string | null;
  mensaje?: string;
  pais?: string | null;
}) {
  const numero = toWhatsApp(telefono, pais);

  // waLink ya hace encodeURIComponent: tildes, emojis y saltos de línea van
  // por ahí sin que haya que tocarlos aquí.
  const texto = mensaje
    ? nombre?.trim()
      ? `¡Hola ${nombre.trim()}! ${mensaje}`
      : mensaje
    : undefined;

  return (
    <a
      href={waLink(numero, texto)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Escribir por WhatsApp a ${nombre?.trim() || telefono}`}
      className="inline-flex items-center gap-1.5 text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
    >
      <WhatsAppIcon className="h-3.5 w-3.5 shrink-0" />
      <span className="tabular-nums">{telefono}</span>
    </a>
  );
}
