"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const inputClasses =
  "w-full rounded-brand border border-border bg-background px-4 py-3 text-foreground focus:border-primary";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const supabase = getSupabaseBrowser();

  if (!supabase) {
    return (
      <p className="rounded-brand border border-border bg-surface p-4 text-muted">
        El panel aún no está configurado: faltan las variables
        NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSending(true);
    const data = new FormData(e.currentTarget);
    const { error: authError } = await supabase!.auth.signInWithPassword({
      email: String(data.get("email")),
      password: String(data.get("password")),
    });
    setSending(false);
    if (authError) {
      setError("Credenciales incorrectas.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor="admin-email">
          Correo
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClasses}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor="admin-password">
          Contraseña
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClasses}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-primary">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-brand bg-primary px-6 py-3 font-semibold uppercase tracking-wide text-primary-contrast disabled:opacity-60"
      >
        {sending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
