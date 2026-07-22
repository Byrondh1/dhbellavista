"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Category, RegistrationFormConfig } from "@/lib/types";
import {
  COMPROBANTE_MAX_BYTES,
  COMPROBANTE_TYPES,
  DEFAULT_CONSENT_TEXT,
} from "@/lib/registration-schema";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";

const OPEN_HASH = "#inscribirse";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const inputClasses =
  "w-full rounded-brand border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted focus:border-primary";

/**
 * Modal de inscripción del módulo propio. Se abre con el hash #inscribirse
 * (todos los CTAs apuntan ahí cuando registrationCta.mode === "modal"),
 * así que también es deep-linkeable al compartir la URL.
 */
export function RegistrationModal({
  form,
  categories,
  eventName,
  whatsappHref,
}: {
  form: RegistrationFormConfig;
  categories: Category[];
  eventName: string;
  whatsappHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    if (window.location.hash === OPEN_HASH) {
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  }, []);

  useEffect(() => {
    const sync = () => setOpen(window.location.hash === OPEN_HASH);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    firstFieldRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const data = new FormData(formEl);

    const file = data.get("comprobante");
    if (file instanceof File && file.size > 0) {
      if (!COMPROBANTE_TYPES.includes(file.type)) {
        setStatus({
          kind: "error",
          message: "El comprobante debe ser una imagen (JPG/PNG/WebP) o PDF.",
        });
        return;
      }
      if (file.size > COMPROBANTE_MAX_BYTES) {
        setStatus({
          kind: "error",
          message: "El comprobante no puede superar los 5 MB.",
        });
        return;
      }
    }

    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/inscripciones", {
        method: "POST",
        body: data,
      });
      if (res.ok) {
        setStatus({ kind: "success" });
        formEl.reset();
      } else {
        const body = await res.json().catch(() => null);
        setStatus({
          kind: "error",
          message:
            body?.error ?? "No pudimos enviar tu inscripción. Intenta de nuevo.",
        });
      }
    } catch {
      setStatus({
        kind: "error",
        message: "Sin conexión. Revisa tu internet e intenta de nuevo.",
      });
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Inscripción — ${eventName}`}
        className="max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-surface p-6 sm:rounded-brand sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Inscripción
            </p>
            <h2 className="text-2xl font-bold uppercase">{eventName}</h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar formulario"
            className="rounded-brand border border-border px-3 py-1 text-xl leading-none text-muted hover:text-foreground"
          >
            ×
          </button>
        </div>

        {form.closed ? (
          <p className="text-lg text-muted">
            Las inscripciones están cerradas. Gracias por el interés — nos
            vemos en la próxima edición.
          </p>
        ) : status.kind === "success" ? (
          <div>
            <h3 className="text-xl font-bold text-primary">
              ¡Inscripción recibida!
            </h3>
            <p className="mt-3 text-muted">
              Tu pago quedó pendiente de verificación. Cuando lo confirmemos te
              llegará un correo con tu inscripción definitiva.
            </p>
            <button
              type="button"
              onClick={close}
              className="mt-6 rounded-brand bg-primary px-6 py-3 font-semibold uppercase tracking-wide text-primary-contrast"
            >
              Listo
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot anti-spam: oculto para humanos */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />

            <div>
              <label className="mb-1 block text-sm font-semibold" htmlFor="ins-nombre">
                Nombre completo *
              </label>
              <input
                ref={firstFieldRef}
                id="ins-nombre"
                name="nombre"
                required
                minLength={3}
                maxLength={120}
                autoComplete="name"
                className={inputClasses}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold" htmlFor="ins-email">
                Correo electrónico *
              </label>
              <input
                id="ins-email"
                name="email"
                type="email"
                required
                maxLength={160}
                autoComplete="email"
                className={inputClasses}
              />
            </div>

            {form.fields.cedula && (
              <div>
                <label className="mb-1 block text-sm font-semibold" htmlFor="ins-cedula">
                  Cédula *
                </label>
                <input
                  id="ins-cedula"
                  name="cedula"
                  required
                  inputMode="numeric"
                  pattern="\d{10}"
                  title="10 dígitos, sin guiones"
                  className={inputClasses}
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold" htmlFor="ins-categoria">
                Categoría *
              </label>
              <select
                id="ins-categoria"
                name="categoria"
                required
                defaultValue=""
                className={inputClasses}
              >
                <option value="" disabled>
                  Selecciona tu categoría
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {form.fields.ciudad && (
              <div>
                <label className="mb-1 block text-sm font-semibold" htmlFor="ins-ciudad">
                  Ciudad de procedencia *
                </label>
                <input
                  id="ins-ciudad"
                  name="ciudad"
                  required
                  maxLength={80}
                  className={inputClasses}
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold" htmlFor="ins-telefono">
                Teléfono / WhatsApp *
              </label>
              <input
                id="ins-telefono"
                name="telefono"
                type="tel"
                required
                pattern="\+?\d{7,15}"
                title="Solo números, ej. 0991234567"
                autoComplete="tel"
                className={inputClasses}
              />
            </div>

            {form.fields.emergencyContact && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="mb-1 block text-sm font-semibold"
                    htmlFor="ins-emergencia-nombre"
                  >
                    Contacto de emergencia *
                  </label>
                  <input
                    id="ins-emergencia-nombre"
                    name="emergenciaNombre"
                    required
                    maxLength={120}
                    placeholder="Nombre"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label
                    className="mb-1 block text-sm font-semibold"
                    htmlFor="ins-emergencia-telefono"
                  >
                    Teléfono de emergencia *
                  </label>
                  <input
                    id="ins-emergencia-telefono"
                    name="emergenciaTelefono"
                    type="tel"
                    required
                    pattern="\+?\d{7,15}"
                    className={inputClasses}
                  />
                </div>
              </div>
            )}

            {form.fields.clubTeam && (
              <div>
                <label className="mb-1 block text-sm font-semibold" htmlFor="ins-club">
                  Club o equipo (opcional)
                </label>
                <input id="ins-club" name="club" maxLength={120} className={inputClasses} />
              </div>
            )}

            {form.comprobante && (
              <div>
                <label className="mb-1 block text-sm font-semibold" htmlFor="ins-comprobante">
                  Comprobante de transferencia *
                </label>
                <input
                  id="ins-comprobante"
                  name="comprobante"
                  type="file"
                  required
                  accept={COMPROBANTE_TYPES.join(",")}
                  className="w-full text-sm text-muted file:mr-3 file:rounded-brand file:border-0 file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-primary-contrast"
                />
                <p className="mt-1 text-xs text-muted">
                  Imagen o PDF, máximo 5 MB.
                </p>
              </div>
            )}

            {/* Consentimiento LOPDP: obligatorio y nunca pre-marcado */}
            <label className="flex items-start gap-3 text-xs leading-relaxed text-muted">
              <input
                type="checkbox"
                name="consentimiento"
                required
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--c-primary)]"
              />
              <span>{form.consentText ?? DEFAULT_CONSENT_TEXT}</span>
            </label>

            {form.privacyNote && (
              <p className="text-xs leading-relaxed text-muted">
                {form.privacyNote}
              </p>
            )}

            {status.kind === "error" && (
              <p role="alert" className="rounded-brand border border-primary/50 bg-primary/10 p-3 text-sm">
                {status.message}
              </p>
            )}

            <button
              type="submit"
              disabled={status.kind === "sending"}
              className="w-full rounded-brand bg-primary px-6 py-3 font-semibold uppercase tracking-wide text-primary-contrast transition-[filter] hover:brightness-110 disabled:opacity-60"
            >
              {status.kind === "sending" ? "Enviando…" : "Enviar inscripción"}
            </button>

            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm font-medium text-muted hover:text-primary"
            >
              <WhatsAppIcon className="h-4 w-4" />
              ¿Problemas con el formulario? Inscríbete por WhatsApp
            </a>
          </form>
        )}
      </div>
    </div>
  );
}
