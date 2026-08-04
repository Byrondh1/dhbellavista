"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Category, RegistrationFormConfig } from "@/lib/types";
import {
  COMPROBANTE_MAX_BYTES,
  COMPROBANTE_TYPES,
  DEFAULT_CONSENT_TEXT,
} from "@/lib/registration-schema";
import { EB_CORP } from "@/lib/ebcorp";
import { MENSAJE_CIERRE_POR_DEFECTO } from "@/lib/estado-inscripciones";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { PasoDatosPago, type DatosPagoVisible } from "./PasoDatosPago";

const OPEN_HASH = "#inscribirse";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success"; emailSent: boolean }
  | { kind: "error"; message: string };

/** Lo que devuelve GET /api/estado-inscripciones, más los estados de carga */
type Carga =
  | { kind: "cargando" }
  | { kind: "error" }
  | {
      kind: "listo";
      cerradas: boolean;
      mensajeCierre: string | null;
      /** null si el evento no tiene datos de pago o el paso está apagado */
      datosPago: DatosPagoVisible | null;
    };

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

  // El estado de las inscripciones y los datos de pago viven en la base
  // (editables desde /admin/configuracion), así que se piden al abrir el
  // modal en una sola petición.
  const [carga, setCarga] = useState<Carga>({ kind: "cargando" });
  const [paso, setPaso] = useState<"pago" | "formulario">("pago");

  /**
   * `closed` en el config es un candado de código que gana siempre; el
   * interruptor del panel es el que se usa a diario. Cerrado si cualquiera de
   * los dos lo dice: así nunca se queda abierto por error.
   */
  const cerradoPorConfig = form.closed === true;
  const cerradas =
    cerradoPorConfig || (carga.kind === "listo" && carga.cerradas);
  /** Los datos reales, o null mientras carga / si no hay / si falló */
  const datosPagoListos = carga.kind === "listo" ? carga.datosPago : null;
  const hayDatosPago = datosPagoListos !== null;

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
    const sync = () => {
      const abierto = window.location.hash === OPEN_HASH;
      setOpen(abierto);
      // Cada apertura empieza por el principio (el formulario no persiste
      // nada al cerrarse, así que no hay progreso que respetar)
      if (abierto) setPaso("pago");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  // Carga al abrir (sin caché, para que un cambio en el panel se vea al
  // instante). Un fallo nunca bloquea la inscripción: se muestra un aviso con
  // el canal de WhatsApp y el endpoint queda como última palabra — si las
  // inscripciones estaban cerradas, responderá 403 y el modal lo dirá.
  useEffect(() => {
    if (!open || cerradoPorConfig) return;
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch("/api/estado-inscripciones", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(String(res.status));
        const body = await res.json();
        if (cancelado) return;
        setCarga({
          kind: "listo",
          cerradas: body?.cerradas === true,
          mensajeCierre: body?.mensajeCierre ?? null,
          datosPago: body?.datosPago ?? null,
        });
      } catch {
        if (!cancelado) setCarga({ kind: "error" });
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [open, cerradoPorConfig]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    if (paso === "formulario") firstFieldRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close, paso]);

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
        const body = await res.json().catch(() => null);
        setStatus({ kind: "success", emailSent: body?.emailSent ?? false });
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
              {hayDatosPago && !cerradas && status.kind !== "success"
                ? paso === "pago"
                  ? "Paso 1 de 2 · Pago"
                  : "Paso 2 de 2 · Tus datos"
                : "Inscripción"}
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

        {/* Si las inscripciones están cerradas no se muestran los datos
            bancarios: el mensaje va antes que cualquier paso. El servidor ni
            siquiera los manda en ese caso. */}
        {cerradas ? (
          <p className="text-lg text-muted">
            {(carga.kind === "listo" && carga.mensajeCierre) ||
              MENSAJE_CIERRE_POR_DEFECTO}
          </p>
        ) : carga.kind === "cargando" ? (
          <p className="py-8 text-center text-muted">Cargando…</p>
        ) : carga.kind === "error" && paso === "pago" ? (
          <div className="space-y-5">
            <p className="text-muted">
              No pudimos cargar los datos de pago en este momento. Escríbenos
              por WhatsApp y te los enviamos, o continúa y súbenos el
              comprobante cuando hayas pagado.
            </p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-brand border border-border px-6 py-3 font-semibold uppercase tracking-wide text-foreground"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Pedir datos por WhatsApp
            </a>
            <button
              type="button"
              onClick={() => setPaso("formulario")}
              className="w-full rounded-brand bg-primary px-6 py-3 font-semibold uppercase tracking-wide text-primary-contrast"
            >
              Continuar al formulario
            </button>
          </div>
        ) : paso === "pago" && datosPagoListos ? (
          <PasoDatosPago
            datos={datosPagoListos}
            onContinuar={() => setPaso("formulario")}
            onCancelar={close}
          />
        ) : status.kind === "success" ? (
          <div>
            <h3 className="text-xl font-bold text-primary">
              ¡Inscripción recibida!
            </h3>
            <p className="mt-3 text-muted">
              {status.emailSent
                ? "Te enviamos un correo con tu inscripción provisional (revisa también el spam). Cuando verifiquemos tu pago te llegará la inscripción definitiva con tu dorsal."
                : "Tu pago quedó pendiente de verificación. Cuando lo confirmemos te llegará un correo con tu inscripción definitiva."}
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
            {/* Volver a consultar la cuenta sin perder lo escrito: en móvil
                la gente sale a hacer la transferencia y regresa */}
            {hayDatosPago && (
              <button
                type="button"
                onClick={() => setPaso("pago")}
                className="text-sm font-medium text-muted hover:text-primary"
              >
                ← Ver datos de pago
              </button>
            )}

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

            {form.fields.categoria && (
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
            )}

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

            {form.fields.placa && (
              <div>
                <label className="mb-1 block text-sm font-semibold" htmlFor="ins-placa">
                  {form.identificador.label} *
                </label>
                <input
                  id="ins-placa"
                  name="placa"
                  required
                  minLength={5}
                  maxLength={12}
                  autoCapitalize="characters"
                  autoComplete="off"
                  placeholder="PCX-1234"
                  // uppercase visual: el servidor normaliza igual, así que no
                  // hay que pelear con el teclado del celular
                  className={`${inputClasses} uppercase tabular-nums`}
                />
                <p className="mt-1 text-xs text-muted">
                  Es tu código de inscripción: con esta placa te acreditamos el
                  día del evento.
                </p>
              </div>
            )}

            {form.fields.copiloto && (
              <div>
                <label className="mb-1 block text-sm font-semibold" htmlFor="ins-copiloto">
                  Nombre del copiloto (opcional)
                </label>
                <input
                  id="ins-copiloto"
                  name="copiloto"
                  maxLength={120}
                  autoComplete="off"
                  className={inputClasses}
                />
                <p className="mt-1 text-xs text-muted">
                  Si vienes con copiloto, escríbelo aquí: el kit de
                  alimentación es para las dos personas.
                </p>
              </div>
            )}

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

            {/* Segunda vía por si el problema es con el pago o el comprobante,
                que por correo se resuelve mejor (se puede adjuntar) */}
            <p className="text-center text-xs text-muted">
              O escríbenos a{" "}
              <a
                href={`mailto:${EB_CORP.inscripciones}?subject=${encodeURIComponent(`Inscripción — ${eventName}`)}`}
                aria-label={`Escribir a inscripciones de ${eventName} por correo`}
                className="font-medium underline hover:text-primary"
              >
                {EB_CORP.inscripciones}
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
