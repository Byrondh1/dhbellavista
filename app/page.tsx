import { getActiveEvent } from "@/lib/event";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Categories } from "@/components/sections/Categories";
import { Schedule } from "@/components/sections/Schedule";
import { Pricing } from "@/components/sections/Pricing";
import { Contact } from "@/components/sections/Contact";
import { Footer } from "@/components/sections/Footer";
import { FloatingWhatsApp } from "@/components/ui/FloatingWhatsApp";

export default function Home() {
  const event = getActiveEvent();
  const { about, categoriesSection, schedule, pricing, contact } =
    event.sections;

  return (
    <>
      <main className="flex-1">
        <Hero event={event} />
        {about && <About section={about} />}
        {categoriesSection && (
          <Categories section={categoriesSection} categories={event.categories} />
        )}
        {schedule && <Schedule section={schedule} />}
        {pricing && <Pricing section={pricing} whatsapp={event.whatsapp} />}
        {contact && (
          <Contact
            section={contact}
            clubName={event.club.name}
            whatsapp={event.whatsapp}
          />
        )}
      </main>
      <Footer event={event} />
      <FloatingWhatsApp
        phone={event.whatsapp.phone}
        message={event.whatsapp.registrationMessage}
      />
    </>
  );
}
