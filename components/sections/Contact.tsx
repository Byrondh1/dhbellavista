import type { ContactSection, EventConfig } from "@/lib/types";
import { EB_CORP } from "@/lib/ebcorp";
import { waLink } from "@/lib/whatsapp";
import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";

export function Contact({
  section,
  clubName,
  eventName,
  whatsapp,
}: {
  section: ContactSection;
  clubName: string;
  eventName: string;
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

      <dl className="mt-8 space-y-3 text-muted">
        {section.email && (
          <div>
            <dt className="inline">Correo del club: </dt>
            <dd className="inline">
              <a
                href={`mailto:${section.email}`}
                aria-label={`Escribir por correo a ${clubName}`}
                className="font-medium text-foreground hover:text-primary"
              >
                {section.email}
              </a>
            </dd>
          </div>
        )}
        {/* Buzón compartido por los dos eventos: dudas de inscripción, pagos
            y comprobantes. Va aquí además del club porque es lo que la gente
            busca cuando no sabe a quién escribirle. */}
        <div>
          <dt className="inline">Inscripciones: </dt>
          <dd className="inline">
            <a
              href={`mailto:${EB_CORP.inscripciones}`}
              aria-label={`Escribir a inscripciones de ${eventName} por correo`}
              className="font-medium text-foreground hover:text-primary"
            >
              {EB_CORP.inscripciones}
            </a>
          </dd>
        </div>
      </dl>

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
