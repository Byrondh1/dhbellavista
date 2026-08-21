"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatoValido, sugerirCorreo } from "@/lib/email-typos";

/**
 * Mostrador del día del evento: se toman los datos del corredor, se cobra el
 * efectivo y se le entrega su número en el momento.
 *
 * Tres pasos a propósito, y el del medio existe por una sola razón: el correo.
 * En la fila se dicta de viva voz y se teclea con prisa, y si sale mal el
 * corredor se va sin su PDF ni su QR y nadie se entera. Por eso antes de
 * guardar se enseña grande y se pide confirmarlo.
 *
 * Pensado para un celular en la mano: campos grandes, un paso por pantalla y
 * el número final ocupando el ancho completo para poder mostrárselo al
 * corredor sin que se acerque a leer.
 */

export interface CamposPresencial {
  cedula: boolean;
  ciudad: boolean;
  emergencyContact: boolean;
  clubTeam: boolean;
  categoria: boolean;
  placa: boolean;
  copiloto: boolean;
}

interface Resultado {
  nombre: string;
  email: string;
  identLabel: string;
  referencia: string | null;
  categoria: string | null;
  emailSent: boolean;
  emailError?: string;
  id: string;
}

const VACIO = {
  nombre: "",
  email: "",
  telefono: "",
  cedula: "",
  ciudad: "",
  categoria: "",
  placa: "",
  copiloto: "",
  emergenciaNombre: "",
  emergenciaTelefono: "",
  club: "",
};

export function InscripcionPresencialForm({
  campos,
  categorias,
  identLabel,
  placaLabel,
  monto,
  consentText,
}: {
  campos: CamposPresencial;
  categorias: { id: string; name: string }[];
  identLabel: string;
  placaLabel: string;
  /** Lo que hay que cobrar, si está configurado en el panel */
  monto: string | null;
  consentText: string;
}) {
  const router = useRouter();
  const [paso, setPaso] = useState<"datos" | "confirmar" | "listo">("datos");
  const [valores, setValores] = useState({ ...VACIO });
  const [consentimiento, setConsentimiento] = useState(false);
  const [cobrado, setCobrado] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const set = (campo: keyof typeof VACIO) => (valor: string) =>
    setValores((v) => ({ ...v, [campo]: valor }));

  // Cada paso empieza arriba: en el celular el formulario deja la página a
  // media altura y el siguiente paso aparecería con su título fuera de vista.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [paso]);

  const email = valores.email.trim();
  const emailMalFormado = email.length > 0 && !formatoValido(email);
  // No bloquea: solo propone. Un dominio propio raro no puede impedir una
  // inscripción con la gente esperando en la fila.
  const sugerencia = useMemo(
    () => (formatoValido(email) ? sugerirCorreo(email) : null),
    [email],
  );

  function continuar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!formatoValido(email)) {
      setError("Revisa el correo: debe tener la forma nombre@dominio.com");
      return;
    }
    setPaso("confirmar");
  }

  async function registrar() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/inscripcion-presencial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...valores,
          email,
          // El servidor valida con el mismo esquema del formulario público,
          // que espera el "on" del checkbox del navegador.
          consentimiento: consentimiento ? "on" : "",
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        setError(body?.error ?? "No se pudo registrar. Intenta de nuevo.");
        // De vuelta a los datos: el error casi siempre es un campo (cédula o
        // placa repetida), y ahí es donde se corrige.
        setPaso("datos");
        return;
      }
      setResultado(body as Resultado);
      setPaso("listo");
      // Para que el contador de dorsales libres (servidor) refleje el que
      // acaba de salir: en el mostrador es el dato que dice si se sigue.
      router.refresh();
    } catch {
      setError("Sin conexión. Revisa la señal e intenta de nuevo.");
      setPaso("datos");
    } finally {
      setBusy(false);
    }
  }

  function otro() {
    setValores({ ...VACIO });
    setConsentimiento(false);
    setCobrado(false);
    setResultado(null);
    setError(null);
    setPaso("datos");
  }

  if (paso === "listo" && resultado) {
    return <Entregado resultado={resultado} onOtro={otro} />;
  }

  if (paso === "confirmar") {
    return (
      <section className="space-y-6">
        <h2 className="text-lg font-bold uppercase">Confirma antes de guardar</h2>

        <div className="rounded-brand border-2 border-primary bg-surface p-4">
          <p className="text-xs uppercase tracking-wider text-muted">
            Se enviará la confirmación a
          </p>
          {/* Grande y partido por caracteres: es para leérselo al corredor y
              que él diga si está bien, no para revisarlo por encima. */}
          <p className="mt-2 text-2xl leading-tight font-bold break-all sm:text-3xl">
            {email}
          </p>
          <p className="mt-3 text-sm text-muted">
            ¿Es correcto? Si se equivoca aquí, no recibirá su PDF ni su código
            QR.
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <Dato label="Nombre" valor={valores.nombre} />
          <Dato label="Teléfono" valor={valores.telefono} />
          {campos.categoria && (
            <Dato
              label="Categoría"
              valor={
                categorias.find((c) => c.id === valores.categoria)?.name ?? "—"
              }
            />
          )}
          {campos.cedula && <Dato label="Cédula" valor={valores.cedula} />}
          {campos.placa && <Dato label={placaLabel} valor={valores.placa} />}
        </dl>

        <label className="flex items-start gap-3 rounded-brand border border-warning bg-surface p-4">
          <input
            type="checkbox"
            checked={cobrado}
            onChange={(e) => setCobrado(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0"
          />
          <span className="text-sm">
            <span className="font-semibold uppercase">
              Recibí el pago en efectivo
              {monto ? ` (${monto})` : ""}
            </span>
            <span className="mt-1 block text-muted">
              La inscripción queda confirmada y cobrada. En la acreditación no
              volverá a aparecer como pendiente de pago.
            </span>
          </span>
        </label>

        {error && (
          <p role="alert" className="text-sm font-medium text-warning">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={busy || !cobrado}
            onClick={registrar}
            className="rounded-brand bg-primary px-6 py-4 text-base font-bold uppercase tracking-wide text-primary-contrast disabled:opacity-50"
          >
            {busy ? "Registrando…" : `Confirmar y asignar ${identLabel}`}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setPaso("datos")}
            className="rounded-brand border-2 border-border px-6 py-4 text-base font-semibold uppercase tracking-wide text-muted disabled:opacity-50"
          >
            Corregir datos
          </button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={continuar} className="space-y-5">
      <Campo
        id="nombre"
        label="Nombre completo"
        value={valores.nombre}
        onChange={set("nombre")}
        required
        autoComplete="off"
        autoCapitalize="words"
      />

      <div>
        <Campo
          id="email"
          label="Correo"
          type="email"
          value={valores.email}
          onChange={set("email")}
          required
          // Los tres arruinan una dirección tecleada en el celular
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="email"
          autoComplete="off"
        />
        {emailMalFormado && (
          <p className="mt-2 text-sm font-medium text-warning">
            Falta algo: el correo va como nombre@dominio.com
          </p>
        )}
        {sugerencia && (
          <div className="mt-2 rounded-brand border border-warning bg-surface p-3">
            <p className="text-sm">
              ¿Quisiste decir <strong className="break-all">{sugerencia}</strong>?
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => set("email")(sugerencia)}
                className="rounded-brand bg-primary px-4 py-2 text-sm font-semibold uppercase text-primary-contrast"
              >
                Sí, corregir
              </button>
              <span className="self-center text-sm text-muted">
                O déjalo como está si es correcto.
              </span>
            </div>
          </div>
        )}
      </div>

      <Campo
        id="telefono"
        label="Teléfono"
        type="tel"
        inputMode="tel"
        value={valores.telefono}
        onChange={set("telefono")}
        required
        autoComplete="off"
        hint="Solo números, con o sin +593"
      />

      {campos.categoria && (
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Categoría</span>
          <select
            required
            value={valores.categoria}
            onChange={(e) => set("categoria")(e.target.value)}
            className="w-full rounded-brand border border-border bg-background px-4 py-3 text-base"
          >
            <option value="">Selecciona…</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {campos.cedula && (
        <Campo
          id="cedula"
          label="Cédula"
          value={valores.cedula}
          onChange={set("cedula")}
          required
          inputMode="numeric"
          autoComplete="off"
          hint="10 dígitos"
        />
      )}

      {campos.placa && (
        <Campo
          id="placa"
          label={placaLabel}
          value={valores.placa}
          onChange={set("placa")}
          required
          autoCapitalize="characters"
          autoComplete="off"
        />
      )}

      {campos.copiloto && (
        <Campo
          id="copiloto"
          label="Copiloto (opcional)"
          value={valores.copiloto}
          onChange={set("copiloto")}
          autoCapitalize="words"
          autoComplete="off"
          hint="Lleno = kit de alimentación para dos"
        />
      )}

      {campos.ciudad && (
        <Campo
          id="ciudad"
          label="Ciudad"
          value={valores.ciudad}
          onChange={set("ciudad")}
          required
          autoCapitalize="words"
          autoComplete="off"
        />
      )}

      {campos.emergencyContact && (
        <>
          <Campo
            id="emergenciaNombre"
            label="Contacto de emergencia"
            value={valores.emergenciaNombre}
            onChange={set("emergenciaNombre")}
            required
            autoCapitalize="words"
            autoComplete="off"
          />
          <Campo
            id="emergenciaTelefono"
            label="Teléfono de emergencia"
            type="tel"
            inputMode="tel"
            value={valores.emergenciaTelefono}
            onChange={set("emergenciaTelefono")}
            required
            autoComplete="off"
          />
        </>
      )}

      {campos.clubTeam && (
        <Campo
          id="club"
          label="Club o equipo (opcional)"
          value={valores.club}
          onChange={set("club")}
          autoCapitalize="words"
          autoComplete="off"
        />
      )}

      {/* La LOPDP no distingue el canal: aquí también se recoge cédula, así
          que el consentimiento se pide igual y se guarda con su texto. */}
      <label className="flex items-start gap-3 rounded-brand border border-border bg-surface p-4">
        <input
          type="checkbox"
          required
          checked={consentimiento}
          onChange={(e) => setConsentimiento(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0"
        />
        <span className="text-sm text-muted">
          El corredor autoriza el tratamiento de sus datos: {consentText}
        </span>
      </label>

      {error && (
        <p role="alert" className="text-sm font-medium text-warning">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-brand bg-primary px-6 py-4 text-base font-bold uppercase tracking-wide text-primary-contrast"
      >
        Revisar el correo
      </button>
    </form>
  );
}

/** Pantalla de entrega: el número, grande, para enseñárselo al corredor */
function Entregado({
  resultado,
  onOtro,
}: {
  resultado: Resultado;
  onOtro: () => void;
}) {
  return (
    <section className="space-y-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-muted">
        {resultado.identLabel} de {resultado.nombre}
      </p>
      <p
        className="leading-none font-bold text-primary tabular-nums"
        // Del ancho de la pantalla, no de un tamaño fijo: en el celular del
        // mostrador tiene que verse desde el otro lado de la mesa.
        style={{ fontSize: "clamp(5rem, 40vw, 12rem)" }}
      >
        {resultado.referencia ?? "—"}
      </p>
      {resultado.categoria && (
        <p className="text-lg font-semibold uppercase">{resultado.categoria}</p>
      )}

      <p
        className={`rounded-brand border p-4 text-sm ${
          resultado.emailSent
            ? "border-border bg-surface text-muted"
            : "border-warning bg-surface text-warning"
        }`}
      >
        {resultado.emailSent ? (
          <>
            Confirmación enviada a{" "}
            <span className="font-semibold break-all">{resultado.email}</span>{" "}
            con su PDF y su código QR.
          </>
        ) : (
          <>
            La inscripción quedó registrada, pero el correo no salió (
            {resultado.emailError ?? "razón desconocida"}). Reenvíalo desde la
            ficha cuando haya señal.
          </>
        )}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onOtro}
          className="rounded-brand bg-primary px-6 py-4 text-base font-bold uppercase tracking-wide text-primary-contrast"
        >
          Inscribir a otro
        </button>
        <Link
          href={`/admin/inscripciones/${resultado.id}`}
          className="rounded-brand border-2 border-border px-6 py-4 text-base font-semibold uppercase tracking-wide text-muted"
        >
          Ver la ficha
        </Link>
      </div>
    </section>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-brand border border-border bg-surface p-3">
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1 font-medium break-words">{valor || "—"}</dd>
    </div>
  );
}

function Campo({
  id,
  label,
  value,
  onChange,
  hint,
  type = "text",
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (valor: string) => void;
  hint?: string;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type">) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // text-base y no text-sm: por debajo de 16px, iOS hace zoom al enfocar
        // y en el mostrador eso es una pantalla que salta en cada campo.
        className="w-full rounded-brand border border-border bg-background px-4 py-3 text-base"
        {...rest}
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
