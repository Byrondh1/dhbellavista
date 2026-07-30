-- Migración 0007: abrir y cerrar inscripciones desde el panel.
--
-- Antes era `registrationForm.closed` en el config del evento (código):
-- cerrar las inscripciones obligaba a editar y redesplegar, justo cuando más
-- apuro hay (cupos llenos, se acabó el plazo). Ahora es un interruptor del
-- panel que surte efecto al instante.
--
-- Vive en evento_datos_pago porque es la misma unidad: la configuración
-- operativa del evento, una fila por slug. El nombre de la tabla se mantiene
-- para no romper las policies ni el código existentes.

alter table public.evento_datos_pago
  add column if not exists inscripciones_cerradas boolean not null default false,
  -- Cuándo se cerraron (solo informativo, se muestra en el panel)
  add column if not exists inscripciones_cerradas_at timestamptz,
  -- Mensaje que ve el público en el modal; null = texto por defecto
  add column if not exists mensaje_cierre text;

-- Los datos bancarios pasan a tener default '' para poder crear la fila con
-- solo el estado de inscripciones: se puede cerrar un evento antes de haber
-- cargado una cuenta. Siguen siendo NOT NULL (nunca hay nulos en el mapeo);
-- que estén vacíos es lo que el sitio interpreta como "sin datos de pago".
alter table public.evento_datos_pago
  alter column banco                  set default '',
  alter column tipo_cuenta            set default '',
  alter column numero_cuenta          set default '',
  alter column titular                set default '',
  alter column identificacion_titular set default '',
  alter column monto                  set default '';

-- RLS: sin cambios. Las policies de la 0006 son por tabla, así que las
-- columnas nuevas quedan cubiertas (lectura y escritura solo para el admin
-- del evento vía is_event_admin; el sitio público lee por Route Handler).
