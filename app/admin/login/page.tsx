import type { Metadata } from "next";
import { getActiveEvent } from "@/lib/event";
import { Container } from "@/components/ui/Container";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Acceso — Panel de inscripciones",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  const event = getActiveEvent();
  return (
    <main className="flex flex-1 items-center py-16">
      <Container className="max-w-md">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          Panel de inscripciones
        </p>
        <h1 className="mb-8 text-3xl font-bold uppercase">{event.name}</h1>
        <LoginForm />
      </Container>
    </main>
  );
}
