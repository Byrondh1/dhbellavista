import { getActiveEvent } from "@/lib/event";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  const event = getActiveEvent();
  const { about } = event.sections;

  return (
    <>
      <main className="flex-1">
        <Hero event={event} />
        {about && <About section={about} />}
      </main>
      <Footer event={event} />
    </>
  );
}
