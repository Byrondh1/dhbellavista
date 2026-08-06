import type { ContactSection, EventConfig } from "@/lib/types";
import { EB_CORP } from "@/lib/ebcorp";
import { telLink, telefonoVisible, waLink } from "@/lib/whatsapp";
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
              <div className="mt-3 flex flex-col items-start gap-2">
                {/* El número a la vista y no solo el botón de WhatsApp: hay
                    quien prefiere llamar, y quien lo quiere para guardarlo en
                    la agenda antes de subir al páramo, donde no hay datos. */}
                <a
                  href={telLink(organizer.phone)}
                  aria-label={`Llamar a ${organizer.name} al ${telefonoVisible(organizer.phone)}`}
                  className="font-medium tabular-nums text-foreground hover:text-primary"
                >
                  {telefonoVisible(organizer.phone)}
                </a>
                <a
                  href={waLink(organizer.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Escribir a ${organizer.name} por WhatsApp`}
                  className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  Escribir por WhatsApp
                </a>
              </div>
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
