"use client";

import { useSyncExternalStore } from "react";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MINUTE = 60_000;

function subscribe(onTick: () => void) {
  const id = setInterval(onTick, MINUTE);
  return () => clearInterval(id);
}

/** Timestamp redondeado al minuto: estable entre ticks, evita re-renders en bucle */
const getNow = () => Math.floor(Date.now() / MINUTE) * MINUTE;

/** En servidor no hay reloj del visitante: se renderiza un placeholder */
const getServerNow = () => null;

/** Cuenta regresiva hasta la fecha del evento (solo visible tras hidratar) */
export function Countdown({ targetIso }: { targetIso: string }) {
  const now = useSyncExternalStore(subscribe, getNow, getServerNow);

  if (now === null) return <div className="h-16" aria-hidden="true" />;

  const remaining = new Date(targetIso).getTime() - now;
  if (remaining <= 0) return null;

  const parts = [
    { label: "días", value: Math.floor(remaining / DAY) },
    { label: "horas", value: Math.floor((remaining % DAY) / HOUR) },
    { label: "min", value: Math.floor((remaining % HOUR) / MINUTE) },
  ];

  return (
    <div className="flex gap-4" role="timer" aria-label="Tiempo restante para el evento">
      {parts.map(({ label, value }) => (
        <div
          key={label}
          className="flex min-w-16 flex-col items-center rounded-brand border border-border bg-surface/60 px-3 py-2 backdrop-blur-sm"
        >
          <span className="text-2xl font-bold tabular-nums sm:text-3xl">
            {value}
          </span>
          <span className="text-xs uppercase tracking-wider text-muted">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
