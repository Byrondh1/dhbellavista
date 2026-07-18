import { getActiveEvent } from "@/lib/event";
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
import { StickyRegistrationCta } from "@/components/ui/StickyRegistrationCta";

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
      <main className="flex-1">
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
    </>
  );
}
