import type { ContactSection, EventConfig } from "@/lib/types";
import { waLink } from "@/lib/whatsapp";
import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";

export function Contact({
  section,
  clubName,
  whatsapp,
}: {
  section: ContactSection;
  clubName: string;
  whatsapp: EventConfig["whatsapp"];
}) {
  return (
    <Section id="contacto">
      <SectionHeading
        kicker={clubName}
        title="Contacto"
        intro="¿Dudas sobre el evento? Escríbenos."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {section.organizers.map((organizer) => (
          <div
            key={organizer.name}
            className="rounded-brand border border-border bg-surface p-6"
          >
            <p className="text-lg font-bold">{organizer.name}</p>
            {organizer.role && (
              <p className="mt-1 text-sm uppercase tracking-wider text-muted">
                {organizer.role}
              </p>
            )}
            {organizer.phone && (
              <a
                href={waLink(organizer.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 font-medium text-primary hover:underline"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Escribir por WhatsApp
              </a>
            )}
          </div>
        ))}
      </div>

      {section.email && (
        <p className="mt-8 text-muted">
          Correo:{" "}
          <a
            href={`mailto:${section.email}`}
            className="font-medium text-foreground hover:text-primary"
          >
            {section.email}
          </a>
        </p>
      )}

      {section.showCommunityCta && whatsapp.communityInviteUrl && (
        <div className="mt-10">
          <ButtonLink
            variant="outline"
            href={whatsapp.communityInviteUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon />
            Únete a la comunidad del evento
          </ButtonLink>
        </div>
      )}
    </Section>
  );
}
