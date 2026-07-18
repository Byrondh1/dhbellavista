import Image from "next/image";
import type { EventConfig } from "@/lib/types";
import { ButtonLink } from "@/components/ui/Button";
import { Countdown } from "@/components/ui/Countdown";
import { RegistrationCtaButton } from "@/components/ui/RegistrationCtaButton";
import { TextureOverlay } from "@/components/ui/TextureOverlay";

export function Hero({ event }: { event: EventConfig }) {
  const hero = event.sections.hero;
  const { whatsapp } = event;

  return (
    <header className="relative flex min-h-svh flex-col justify-end overflow-hidden">
      <Image
        src={hero.backgroundImage.src}
        alt={hero.backgroundImage.alt}
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        className="object-cover"
      />
      {/* Degradado para legibilidad del texto sobre la foto */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20"
      />
      <TextureOverlay theme={event.theme} zone="hero" />

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-28 sm:px-6 sm:pb-24">
        <div className="mb-6 flex items-center gap-3">
          <Image
            src={event.club.logo.src}
            alt={event.club.logo.alt}
            width={48}
            height={48}
            className="h-12 w-12 rounded-brand object-cover"
          />
          <span className="text-sm font-semibold uppercase tracking-widest text-muted">
            {event.club.name}
          </span>
        </div>

        <h1 className="max-w-3xl text-5xl font-bold uppercase leading-none tracking-tight sm:text-7xl">
          {event.name}
        </h1>

        {event.tagline && (
          <p className="mt-4 max-w-xl text-lg text-muted sm:text-xl">
            {event.tagline}
          </p>
        )}

        <p className="mt-6 text-lg font-semibold sm:text-xl">
          <span className="text-primary">{event.date.displayLabel}</span>
          <span className="mx-2 text-muted" aria-hidden="true">
            ·
          </span>
          {event.location.venue}, {event.location.city} —{" "}
          {event.location.province}
          {event.location.googleMapsUrl && (
            <>
              {" "}
              <a
                href={event.location.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap text-base font-medium text-muted underline underline-offset-4 hover:text-primary"
              >
                Cómo llegar
              </a>
            </>
          )}
        </p>

        {hero.showCountdown && (
          <div className="mt-8">
            <Countdown targetIso={event.date.start} />
          </div>
        )}

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <RegistrationCtaButton event={event} />
          {hero.secondaryCtaLabel && whatsapp.communityInviteUrl && (
            <ButtonLink
              variant="outline"
              href={whatsapp.communityInviteUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {hero.secondaryCtaLabel}
            </ButtonLink>
          )}
        </div>
      </div>
    </header>
  );
}
