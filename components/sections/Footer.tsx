import Image from "next/image";
import type { EventConfig } from "@/lib/types";
import { EB_CORP } from "@/lib/ebcorp";
import { Container } from "@/components/ui/Container";
import { TextureOverlay } from "@/components/ui/TextureOverlay";

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};

export function Footer({ event }: { event: EventConfig }) {
  const socials = Object.entries(event.club.socials ?? {}).filter(
    ([, url]) => url,
  );

  return (
    <footer className="relative overflow-hidden border-t border-border bg-surface">
      <TextureOverlay theme={event.theme} zone="footer" />
      {/* pb extra en móvil para que el CTA sticky no tape el crédito */}
      <Container className="relative pt-12 pb-24 sm:pb-12">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Image
              src={event.club.logo.src}
              alt={event.club.logo.alt}
              width={40}
              height={40}
              className="h-10 w-10 rounded-brand object-cover"
            />
            <div>
              <p className="font-semibold">{event.club.name}</p>
              <p className="text-sm text-muted">
                {event.location.city}, {event.location.province} —{" "}
                {event.location.country}
              </p>
              {event.sections.contact?.email && (
                <a
                  href={`mailto:${event.sections.contact.email}`}
                  aria-label={`Escribir por correo a ${event.club.name}`}
                  className="text-sm font-medium text-muted hover:text-primary"
                >
                  {event.sections.contact.email}
                </a>
              )}
            </div>
          </div>

          {socials.length > 0 && (
            <nav aria-label="Redes sociales del club">
              <ul className="flex gap-6">
                {socials.map(([network, url]) => (
                  <li key={network}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-muted transition-colors hover:text-primary"
                    >
                      {SOCIAL_LABELS[network] ?? network}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-sm text-muted sm:flex-row sm:justify-between">
          <p>
            © {new Date(event.date.start).getFullYear()} {event.club.name} ·{" "}
            {event.name}
          </p>
          <p>
            Desarrollado por{" "}
            <a
              href={`mailto:${EB_CORP.email}`}
              aria-label={`Escribir a ${EB_CORP.nombre} por correo`}
              className="font-medium text-foreground hover:text-primary"
            >
              {EB_CORP.nombre}
            </a>
          </p>
        </div>
      </Container>
    </footer>
  );
}
