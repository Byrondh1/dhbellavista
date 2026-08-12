-- Migración 0009: pago en efectivo el día del evento.
--
-- Caso real: participantes de Colombia que no pueden transferir a Ecuador.
-- Se los confirma igual —reciben su QR y cuentan como inscritos— pero alguien
-- tiene que cobrarles antes de entregarles el kit.
--
-- Por qué una columna aparte y no un estado nuevo: `estado` se compara contra
-- 'verificada' en el guard del check-in, en la consulta de asistencia, en la
-- RPC verificar_inscripcion y en el badge del panel. Un cuarto valor obligaría
-- a tocar los cinco sitios. Esta marca es ortogonal al estado: la inscripción
-- es 'verificada' como cualquier otra y la columna solo cambia lo que se
-- muestra.
--
-- Es una migración puramente aditiva: `default false` hace que toda fila
-- existente y toda inscripción por transferencia se comporten exactamente
-- igual que antes. Se puede correr con el sitio en producción sin romper nada
-- (el código desplegado hoy ni siquiera menciona estas columnas).

alter table public.inscripciones
  -- true = se confirmó sin haber recibido el pago; hay que cobrar en sitio
  add column if not exists pago_en_sitio boolean not null default false,
  -- Cuándo se cobró el efectivo en el evento. null con pago_en_sitio = true
  -- significa que todavía debe: es lo que dispara el aviso en el check-in.
  add column if not exists pago_cobrado_at timestamptz,
  -- Quién lo cobró, para poder cuadrar la caja después
  add column if not exists pago_cobrado_por uuid references auth.users(id);

-- Incoherencia imposible: no se puede haber cobrado un pago en sitio que
-- nunca se marcó como tal.
alter table public.inscripciones
  drop constraint if exists inscripciones_pago_cobrado_coherente;
alter table public.inscripciones
  add constraint inscripciones_pago_cobrado_coherente
  check (pago_cobrado_at is null or pago_en_sitio);

-- La lista de "quién debe" el día del evento: pocos registros sobre muchos,
-- así que el índice parcial es el que corresponde.
create index if not exists inscripciones_pago_pendiente_idx
  on public.inscripciones (event_slug)
  where pago_en_sitio and pago_cobrado_at is null;

comment on column public.inscripciones.pago_en_sitio is
  'Confirmada sin pago recibido: se cobra en efectivo el día del evento.';
comment on column public.inscripciones.pago_cobrado_at is
  'Cuándo se cobró en sitio. Null con pago_en_sitio=true = todavía debe.';

-- Sin cambios de RLS: las columnas viven en public.inscripciones, que ya
-- tiene sus policies por is_event_admin(event_slug) desde la migración 0002.
