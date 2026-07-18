import { waLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./WhatsAppIcon";

/** Botón flotante de WhatsApp, siempre accesible en móvil */
export function FloatingWhatsApp({
  phone,
  message,
}: {
  phone: string;
  message: string;
}) {
  return (
    <a
      href={waLink(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Inscríbete por WhatsApp"
      className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-contrast shadow-lg shadow-black/40 transition-transform hover:scale-105"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
