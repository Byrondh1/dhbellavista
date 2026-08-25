"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Las cuatro acciones de la grilla, cada una en su tarjeta y en el orden en
 * que se usan: ordenar categorías → sortear → repartir horas → enviar.
 *
 * La separación no es cosmética. Sortear rebaraja a todo el mundo y por eso
 * pide confirmación; recalcular horas es aritmética sobre el orden ya fijado
 * y por eso se puede hacer sin miedo las veces que haga falta. Que sean dos
 * botones distintos es la garantía de no rebarajar por querer mover la hora
 * de inicio.
 */

interface CategoriaFila {
  id: string;
  nombre: string;
  corredores: number;
}

type Aviso = { tipo: "ok" | "error"; texto: string } | null;

export function GrillaPanel({
  categorias: categoriasIniciales,
  totalVerificados,
  conTurno,
  conHora,
  yaRecibieron,
  sorteadaAt,
  horasCalculadasAt,
  horaInicio: horaInicioInicial,
  intervaloMin: intervaloInicial,
  previewHtml,
  urlGrillaPublica,
}: {
  categorias: CategoriaFila[];
  totalVerificados: number;
  conTurno: number;
  conHora: number;
  yaRecibieron: number;
  sorteadaAt: string | null;
  horasCalculadasAt: string | null;
  horaInicio: string;
  intervaloMin: number;
  previewHtml: string | null;
  urlGrillaPublica: string;
}) {
  const router = useRouter();
  const [categorias, setCategorias] = useState(categoriasIniciales);
  const [ordenSucio, setOrdenSucio] = useState(false);
  const [horaInicio, setHoraInicio] = useState(horaInicioInicial);
  const [intervalo, setIntervalo] = useState(String(intervaloInicial));
  const [verPreview, setVerPreview] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<Record<string, Aviso>>({});
  const [progreso, setProgreso] = useState<{
    enviados: number;
    total: number;
  } | null>(null);

  const avisar = (clave: string, aviso: Aviso) =>
    setAvisos((a) => ({ ...a, [clave]: aviso }));

  /**
   * Cerrojo contra el doble disparo, el mismo del mostrador presencial.
   *
   * `disabled={busy !== null}` es un guard de RENDER: solo existe cuando React
   * ha vuelto a pintar, y los clics que llegan antes de ese commit entran
   * todos. Aquí duele especialmente en "enviar": un doble clic mandaría la
   * grilla dos veces a los cien corredores, con el tope diario de Resend de
   * por medio.
   *
   * Se cierra de forma síncrona y ANTES del window.confirm. Mientras el
   * diálogo está abierto el navegador encola los clics y los suelta al
   * aceptarlo: sin el cerrojo puesto antes, cada clic encolado abriría su
   * propio diálogo y dispararía su propia acción.
   *
   * Uno solo para las cuatro acciones, igual que `busy` es uno solo: en este
   * panel nunca hay dos cosas en marcha a la vez.
   */
  const enCurso = useRef(false);

  /** Toma el cerrojo, o devuelve false si ya hay una acción en marcha */
  function tomarCerrojo(): boolean {
    if (enCurso.current) return false;
    enCurso.current = true;
    return true;
  }

  function soltarCerrojo() {
    enCurso.current = false;
    setBusy(null);
  }

  async function llamar(cuerpo: Record<string, unknown>) {
    const res = await fetch("/api/admin/grilla", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    return { res, body: await res.json().catch(() => null) };
  }

  function mover(indice: number, direccion: -1 | 1) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= categorias.length) return;
    const copia = [...categorias];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    setCategorias(copia);
    setOrdenSucio(true);
    avisar("orden", null);
  }

  async function guardarOrden() {
    if (!tomarCerrojo()) return;
    setBusy("orden");
    avisar("orden", null);
    try {
      const { res, body } = await llamar({
        action: "reordenar-categorias",
        orden: categorias.map((c) => c.id),
      });
      if (!res.ok) {
        avisar("orden", { tipo: "error", texto: body?.error ?? "No se pudo guardar." });
        return;
      }
      setOrdenSucio(false);
      avisar("orden", {
        tipo: "ok",
        texto: body?.horasDesfasadas
          ? "Orden guardado. Las horas quedaron desfasadas: vuelve a calcularlas."
          : "Orden guardado.",
      });
      router.refresh();
    } catch {
      avisar("orden", { tipo: "error", texto: "Sin conexión." });
    } finally {
      soltarCerrojo();
    }
  }

  async function sortear() {
    // El cerrojo primero: los clics que llegan mientras el diálogo está
    // abierto se sueltan al aceptarlo, y sin esto cada uno abriría su propio
    // diálogo y lanzaría su propio sorteo.
    if (!tomarCerrojo()) return;

    // El diálogo con las palabras exactas de la advertencia. El servidor lo
    // exige igual: esto es la cortesía, no la salvaguarda.
    if (
      sorteadaAt &&
      !window.confirm(
        "Esto va a re-sortear a TODOS los corredores, se perderá el orden actual. ¿Continuar?",
      )
    ) {
      soltarCerrojo();
      return;
    }
    setBusy("sortear");
    avisar("sortear", null);
    try {
      const { res, body } = await llamar({
        action: "sortear",
        confirmar: Boolean(sorteadaAt),
      });
      if (!res.ok) {
        avisar("sortear", {
          tipo: "error",
          texto: body?.error ?? "No se pudo sortear.",
        });
        return;
      }
      avisar("sortear", {
        tipo: "ok",
        texto: `Grilla sorteada: ${body.total} corredores con turno. Ahora calcula las horas.`,
      });
      router.refresh();
    } catch {
      avisar("sortear", { tipo: "error", texto: "Sin conexión." });
    } finally {
      soltarCerrojo();
    }
  }

  async function calcularHoras() {
    if (!tomarCerrojo()) return;
    setBusy("horas");
    avisar("horas", null);
    try {
      const { res, body } = await llamar({
        action: "calcular-horas",
        horaInicio,
        intervaloMin: Number(intervalo),
      });
      if (!res.ok) {
        avisar("horas", { tipo: "error", texto: body?.error ?? "No se pudo calcular." });
        return;
      }
      avisar("horas", {
        tipo: "ok",
        texto: `${body.total} corredores, de ${body.primera} a ${body.ultima}.`,
      });
      router.refresh();
    } catch {
      avisar("horas", { tipo: "error", texto: "Sin conexión." });
    } finally {
      soltarCerrojo();
    }
  }

  /**
   * El envío avanza por lotes: cada llamada manda unos pocos y devuelve
   * cuántos faltan. Así se ve el avance y, si algo se corta, se retoma sin
   * volver a escribirle a quien ya recibió el suyo.
   */
  async function enviar(soloFaltantes: boolean) {
    // Igual que en el sorteo, y aquí es lo más importante del archivo: un
    // segundo clic aceptado mandaría la grilla otra vez a todos.
    if (!tomarCerrojo()) return;

    const pendientes = soloFaltantes ? conHora - yaRecibieron : conHora;
    if (
      !window.confirm(
        `Se va a enviar la grilla a ${pendientes} corredores, a su correo registrado. ¿Continuar?`,
      )
    ) {
      soltarCerrojo();
      return;
    }
    setBusy("enviar");
    avisar("enviar", null);
    setProgreso({ enviados: 0, total: pendientes });

    let enviados = 0;
    const fallidos: { nombre: string; razon: string }[] = [];
    try {
      // Cota dura de vueltas: nunca debe quedarse dando vueltas sola
      for (let vuelta = 0; vuelta < 200; vuelta++) {
        const { res, body } = await llamar({
          action: "enviar-correos",
          soloFaltantes,
        });
        if (!res.ok) {
          avisar("enviar", {
            tipo: "error",
            texto: `${body?.error ?? "El envío falló."} Enviados hasta ahora: ${enviados}.`,
          });
          return;
        }
        enviados += body.enviados ?? 0;
        fallidos.push(...(body.fallidos ?? []));
        setProgreso({ enviados, total: Math.max(pendientes, enviados) });
        if ((body.restantes ?? 0) === 0) break;
        // A partir de aquí siempre se reanuda solo con los que faltan, aunque
        // la primera vuelta fuera un reenvío a todos.
        soloFaltantes = true;
      }
      avisar("enviar", {
        tipo: fallidos.length > 0 ? "error" : "ok",
        texto:
          fallidos.length > 0
            ? `${enviados} correos enviados. ${fallidos.length} fallaron: ${fallidos
                .slice(0, 3)
                .map((f) => `${f.nombre} (${f.razon})`)
                .join("; ")}${fallidos.length > 3 ? "…" : ""}. Vuelve a darle a "Enviar a los que faltan".`
            : `${enviados} correos enviados.`,
      });
      router.refresh();
    } catch {
      avisar("enviar", {
        tipo: "error",
        texto: `Sin conexión. Enviados hasta ahora: ${enviados}. Puedes reanudar con "Enviar a los que faltan".`,
      });
    } finally {
      soltarCerrojo();
    }
  }

  const faltanPorRecibir = conHora - yaRecibieron;

  return (
    <div className="space-y-6">
      {/* ── 1. Orden de las categorías ─────────────────────────────────── */}
      <Tarjeta
        numero={1}
        titulo="Orden de las categorías"
        detalle="El orden en que salen las tandas. Se guarda en la base: cambiarlo no exige volver a desplegar el sitio."
      >
        <ol className="mb-4 space-y-2">
          {categorias.map((categoria, i) => (
            <li
              key={categoria.id}
              className="flex items-center gap-3 rounded-brand border border-border bg-background p-3"
            >
              <span className="w-6 text-center font-bold tabular-nums text-muted">
                {i + 1}
              </span>
              <span className="flex-1 font-medium">
                {categoria.nombre}{" "}
                <span className="text-sm text-muted">
                  ({categoria.corredores})
                </span>
              </span>
              <button
                type="button"
                aria-label={`Subir ${categoria.nombre}`}
                disabled={i === 0 || busy !== null}
                onClick={() => mover(i, -1)}
                className="h-10 w-10 rounded-brand border border-border text-lg disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Bajar ${categoria.nombre}`}
                disabled={i === categorias.length - 1 || busy !== null}
                onClick={() => mover(i, 1)}
                className="h-10 w-10 rounded-brand border border-border text-lg disabled:opacity-30"
              >
                ↓
              </button>
            </li>
          ))}
        </ol>
        <Boton
          onClick={guardarOrden}
          disabled={!ordenSucio || busy !== null}
          cargando={busy === "orden"}
        >
          Guardar orden
        </Boton>
        <Mensaje aviso={avisos.orden} />
      </Tarjeta>

      {/* ── 2. El sorteo ───────────────────────────────────────────────── */}
      <Tarjeta
        numero={2}
        titulo="Sortear el orden de salida"
        detalle="Reparte al azar el turno de cada corredor dentro de su categoría. Entran los verificados; el turno no tiene nada que ver con el dorsal."
      >
        {sorteadaAt ? (
          <p className="mb-4 rounded-brand border border-warning bg-background p-3 text-sm">
            <span className="font-semibold uppercase text-warning">
              Ya está sorteada
            </span>{" "}
            ({new Date(sorteadaAt).toLocaleString("es-EC")}). Volver a sortear
            reemplaza el orden de los {conTurno} corredores, y quien ya haya
            recibido su correo tendrá una hora que dejó de ser la suya.
          </p>
        ) : (
          <p className="mb-4 text-sm text-muted">
            Todavía sin sortear. Entrarán {totalVerificados} corredores
            verificados.
          </p>
        )}
        <Boton
          onClick={sortear}
          disabled={busy !== null || totalVerificados === 0}
          cargando={busy === "sortear"}
          textoCargando="Sorteando…"
          variante={sorteadaAt ? "peligro" : "principal"}
        >
          {sorteadaAt ? "Re-sortear la grilla" : "Generar grilla de salida"}
        </Boton>
        <Mensaje aviso={avisos.sortear} />
      </Tarjeta>

      {/* ── 3. Las horas ───────────────────────────────────────────────── */}
      <Tarjeta
        numero={3}
        titulo="Calcular las horas de salida"
        detalle="Aritmética sobre el orden ya sorteado: esto NO rebaraja a nadie. Entre categorías queda un intervalo libre extra."
      >
        <div className="mb-4 flex flex-wrap gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Hora de inicio</span>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="rounded-brand border border-border bg-background px-4 py-3 text-base"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Intervalo (minutos)</span>
            <input
              type="number"
              min={1}
              max={60}
              value={intervalo}
              onChange={(e) => setIntervalo(e.target.value)}
              inputMode="numeric"
              className="w-28 rounded-brand border border-border bg-background px-4 py-3 text-base"
            />
          </label>
        </div>
        {horasCalculadasAt && (
          <p className="mb-4 text-sm text-muted">
            Calculadas el {new Date(horasCalculadasAt).toLocaleString("es-EC")}.
            Recalcular es seguro: solo cambia las horas.
          </p>
        )}
        <Boton
          onClick={calcularHoras}
          disabled={busy !== null || conTurno === 0}
          cargando={busy === "horas"}
          textoCargando="Calculando…"
        >
          {horasCalculadasAt ? "Recalcular horas" : "Calcular horas"}
        </Boton>
        <Mensaje aviso={avisos.horas} />
      </Tarjeta>

      {/* ── 4. El envío ────────────────────────────────────────────────── */}
      <Tarjeta
        numero={4}
        titulo="Enviar la grilla a los participantes"
        detalle="No se dispara solo. Revisa la grilla de abajo y recién entonces envía."
      >
        {conHora === 0 ? (
          <p className="text-sm text-muted">
            Nadie tiene hora todavía. Sortea y calcula las horas antes de
            enviar.
          </p>
        ) : (
          <>
            <dl className="mb-4 grid grid-cols-3 gap-3 text-center">
              {[
                { label: "En la grilla", value: conHora },
                { label: "Ya recibieron", value: yaRecibieron },
                { label: "Faltan", value: faltanPorRecibir },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-brand border border-border bg-background p-3"
                >
                  <dd className="text-2xl font-bold text-primary tabular-nums">
                    {value}
                  </dd>
                  <dt className="text-xs uppercase tracking-wider text-muted">
                    {label}
                  </dt>
                </div>
              ))}
            </dl>

            <p className="mb-4 text-sm text-muted">
              Cada correo lleva la hora del corredor y el enlace a{" "}
              <span className="break-all text-foreground">{urlGrillaPublica}</span>
              , que siempre muestra la versión corregida.
            </p>

            {previewHtml && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setVerPreview((v) => !v)}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  {verPreview ? "Ocultar" : "Ver"} el correo tal como lo van a
                  recibir
                </button>
                {verPreview && (
                  <iframe
                    title="Vista previa del correo de la grilla"
                    srcDoc={previewHtml}
                    // sandbox sin allow-scripts: es una previsualización, no
                    // tiene por qué poder ejecutar nada
                    sandbox=""
                    className="mt-3 h-96 w-full rounded-brand border border-border bg-white"
                  />
                )}
              </div>
            )}

            {progreso && busy === "enviar" && (
              <div className="mb-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(100, progreso.total === 0 ? 100 : (progreso.enviados / progreso.total) * 100)}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-sm text-muted tabular-nums">
                  Enviando… {progreso.enviados} de {progreso.total}. No cierres
                  esta pantalla.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Boton
                onClick={() => enviar(true)}
                disabled={busy !== null || faltanPorRecibir === 0}
                cargando={busy === "enviar"}
                textoCargando="Enviando…"
              >
                {yaRecibieron > 0
                  ? `Enviar a los que faltan (${faltanPorRecibir})`
                  : `Enviar grilla a ${conHora} participantes`}
              </Boton>
              {yaRecibieron > 0 && (
                <Boton
                  onClick={() => enviar(false)}
                  disabled={busy !== null}
                  cargando={busy === "enviar"}
                  textoCargando="Enviando…"
                  variante="secundario"
                >
                  Reenviar a todos ({conHora})
                </Boton>
              )}
            </div>
            <Mensaje aviso={avisos.enviar} />
          </>
        )}
      </Tarjeta>
    </div>
  );
}

function Tarjeta({
  numero,
  titulo,
  detalle,
  children,
}: {
  numero: number;
  titulo: string;
  detalle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-brand border border-border bg-surface p-4 sm:p-5">
      <h2 className="text-lg font-bold uppercase">
        <span className="mr-2 text-muted tabular-nums">{numero}.</span>
        {titulo}
      </h2>
      <p className="mt-1 mb-4 text-sm text-muted">{detalle}</p>
      {children}
    </section>
  );
}

function Boton({
  onClick,
  disabled,
  cargando,
  /** Qué dice mientras trabaja. Cada acción tarda distinto y conviene que
      el botón diga cuál es la que está corriendo. */
  textoCargando = "Trabajando…",
  variante = "principal",
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  cargando?: boolean;
  textoCargando?: string;
  variante?: "principal" | "secundario" | "peligro";
  children: React.ReactNode;
}) {
  const estilos = {
    principal: "bg-primary text-primary-contrast",
    secundario: "border-2 border-border text-muted",
    peligro: "border-2 border-warning text-warning",
  }[variante];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || cargando}
      className={`rounded-brand px-6 py-3 text-base font-semibold uppercase tracking-wide disabled:opacity-50 ${estilos}`}
    >
      {cargando ? textoCargando : children}
    </button>
  );
}

function Mensaje({ aviso }: { aviso: Aviso }) {
  if (!aviso) return null;
  return (
    <p
      role="alert"
      className={`mt-3 text-sm font-medium ${aviso.tipo === "ok" ? "text-primary" : "text-warning"}`}
    >
      {aviso.texto}
    </p>
  );
}
