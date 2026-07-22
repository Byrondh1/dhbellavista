import { getActiveEvent } from "@/lib/event";
import { buildEventJsonLd } from "@/lib/jsonld";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Categories } from "@/components/sections/Categories";
import { Route } from "@/components/sections/Route";
import { Schedule } from "@/components/sections/Schedule";
import { Pricing } from "@/components/sections/Pricing";
import { Rules } from "@/components/sections/Rules";
import { Sponsors } from "@/components/sections/Sponsors";
import { Gallery } from "@/components/sections/Gallery";
import { Contact } from "@/components/sections/Contact";
import { Footer } from "@/components/sections/Footer";
import { RegistrationModal } from "@/components/registration/RegistrationModal";
import { StickyRegistrationCta } from "@/components/ui/StickyRegistrationCta";
import { waLink } from "@/lib/whatsapp";

export default function Home() {
  const event = getActiveEvent();
  const {
    about,
    categoriesSection,
    route,
    schedule,
    pricing,
    rules,
    sponsors,
    gallery,
    contact,
  } = event.sections;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildEventJsonLd(event)),
        }}
      />
      <main id="contenido" className="flex-1">
        <Hero event={event} />
        {about && <About section={about} />}
        {categoriesSection && (
          <Categories section={categoriesSection} categories={event.categories} />
        )}
        {route && <Route section={route} />}
        {schedule && <Schedule section={schedule} />}
        {pricing && <Pricing section={pricing} event={event} />}
        {rules && <Rules section={rules} />}
        {sponsors && <Sponsors section={sponsors} />}
        {gallery && <Gallery section={gallery} />}
        {contact && (
          <Contact
            section={contact}
            clubName={event.club.name}
            whatsapp={event.whatsapp}
          />
        )}
      </main>
      <Footer event={event} />
      <StickyRegistrationCta event={event} />
      {event.registrationCta.mode === "modal" && event.registrationForm && (
        <RegistrationModal
          form={event.registrationForm}
          categories={event.categories}
          eventName={event.name}
          whatsappHref={waLink(
            event.whatsapp.phone,
            event.whatsapp.registrationMessage,
          )}
        />
      )}
    </>
  );
}
