-- Migración 0011: grilla de salida (orden sorteado y hora por corredor).
--
-- En el downhill se baja de a uno. La grilla decide en qué orden sale cada
-- corredor dentro de su categoría, en qué orden salen las categorías, y a qué
-- minuto exacto arranca cada uno.
--
-- Tres piezas, y cada una está separada a propósito:
--   · el ORDEN se sortea una vez y no se vuelve a tocar sin avisar;
--   · las HORAS son aritmética sobre ese orden, así que recalcularlas es
--     inofensivo y se puede hacer las veces que haga falta;
--   · el ORDEN DE LAS CATEGORÍAS se edita desde el panel, sin redesplegar.
--
-- Puramente aditiva: sin la grilla generada, todo se comporta como hoy.

-- ── 1. Orden de salida y hora de cada corredor ───────────────────────────
alter table public.inscripciones
  -- Posición DENTRO de su categoría (1, 2, 3…). Independiente del dorsal:
  -- el dorsal es su número de corredor, esto es su turno de salida.
  add column if not exists salida_orden integer,
  -- La hora exacta a la que le toca. Se guarda calculada y no se deriva al
  -- vuelo porque es un compromiso con el corredor: si alguien no se presenta,
  -- su minuto queda vacío y NADIE se mueve.
  -- `time` y no `timestamptz`: el evento pasa en un solo día y en una sola
  -- zona horaria, y una hora de reloj es lo que se le dice a la gente.
  add column if not exists salida_hora time,
  -- Cuándo se le envió SU grilla. Es lo que permite reanudar un envío masivo
  -- que se cortó a media lista sin volver a escribirle a los primeros.
  add column if not exists correo_grilla_at timestamptz;

-- Dos corredores de la misma categoría no pueden compartir turno.
drop index if exists public.inscripciones_salida_orden_unico;
create unique index inscripciones_salida_orden_unico
  on public.inscripciones (event_slug, categoria, salida_orden)
  where salida_orden is not null;

comment on column public.inscripciones.salida_orden is
  'Turno de salida dentro de su categoría, sorteado. Nada que ver con el dorsal.';
comment on column public.inscripciones.salida_hora is
  'Hora de salida asignada. Fija: una ausencia deja el minuto vacío y no corre a nadie.';

-- ── 2. Orden de las categorías, editable desde el panel ──────────────────
-- Vive en la base y no en el config del evento por la misma razón que los
-- datos de pago: moverla no puede exigir un despliegue. El config sigue
-- siendo el orden por defecto con el que se siembra la primera vez.
create table if not exists public.evento_categorias (
  event_slug text not null,
  -- El id de la categoría tal como está en el config del evento
  categoria text not null,
  posicion integer not null,
  primary key (event_slug, categoria)
);

alter table public.evento_categorias enable row level security;

drop policy if exists "admin del evento lee el orden" on public.evento_categorias;
drop policy if exists "admin del evento edita el orden" on public.evento_categorias;
drop policy if exists "admin del evento crea el orden" on public.evento_categorias;

create policy "admin del evento lee el orden"
  on public.evento_categorias for select
  to authenticated
  using (public.is_event_admin(event_slug));

create policy "admin del evento edita el orden"
  on public.evento_categorias for update
  to authenticated
  using (public.is_event_admin(event_slug))
  with check (public.is_event_admin(event_slug));

create policy "admin del evento crea el orden"
  on public.evento_categorias for insert
  to authenticated
  with check (public.is_event_admin(event_slug));

-- ── 3. Estado de la grilla del evento ────────────────────────────────────
-- Una fila por evento. Guarda con qué parámetros se calcularon las horas (para
-- poder repetirlos) y si el sorteo ya se corrió: eso último es lo que dispara
-- la advertencia antes de re-sortear.
create table if not exists public.evento_grilla (
  event_slug text primary key,
  sorteada_at timestamptz,
  hora_inicio time,
  intervalo_min integer not null default 1,
  horas_calculadas_at timestamptz,
  -- Última vez que se disparó un envío masivo. El detalle de a quién le llegó
  -- está en inscripciones.correo_grilla_at, que es lo que se consulta para
  -- reanudar.
  correos_enviados_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.evento_grilla enable row level security;

drop policy if exists "admin del evento lee la grilla" on public.evento_grilla;
drop policy if exists "admin del evento edita la grilla" on public.evento_grilla;
drop policy if exists "admin del evento crea la grilla" on public.evento_grilla;

create policy "admin del evento lee la grilla"
  on public.evento_grilla for select
  to authenticated
  using (public.is_event_admin(event_slug));

create policy "admin del evento edita la grilla"
  on public.evento_grilla for update
  to authenticated
  using (public.is_event_admin(event_slug))
  with check (public.is_event_admin(event_slug));

create policy "admin del evento crea la grilla"
  on public.evento_grilla for insert
  to authenticated
  with check (public.is_event_admin(event_slug));

-- Ninguna de las dos tablas se abre a anon. La grilla pública la sirve el
-- servidor con el service role y publicando solo nombre, dorsal y hora — la
-- tabla de inscripciones tiene cédulas y correos, y de ahí no sale nada más.

-- ── 4. El sorteo, en una sola transacción ────────────────────────────────
-- En SQL y no en la aplicación por dos razones: son cien filas que hay que
-- escribir de una (cien round-trips desde el servidor sería lento y, peor,
-- interrumpible a medias), y el reparto sale de un solo `row_number` sobre
-- `random()`, que es exactamente lo que se quiere.
--
-- Primero pone en null todos los turnos del evento y después reparte. El
-- reset no es un detalle: el índice único es parcial (ignora los null), así
-- que vaciar antes evita que una permutación choque consigo misma a mitad
-- de la escritura.
create or replace function public.sortear_grilla(p_event_slug text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
begin
  -- Un solo sorteo a la vez por evento
  perform pg_advisory_xact_lock(hashtext('grilla|' || p_event_slug));

  update public.inscripciones
     set salida_orden = null
   where event_slug = p_event_slug
     and salida_orden is not null;

  with sorteo as (
    select id,
           row_number() over (
             partition by categoria order by random()
           ) as turno
      from public.inscripciones
     where event_slug = p_event_slug
       and estado = 'verificada'
  )
  update public.inscripciones i
     set salida_orden = s.turno
    from sorteo s
   where i.id = s.id;

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

-- ── 5. Guardar las horas calculadas ──────────────────────────────────────
-- El reparto de horas se calcula en la aplicación (lib/grilla.ts, que está
-- probado con lápiz y papel) y se guarda de una sola vez. p_horas llega como
-- [{"id": "...", "hora": "12:04"}, …].
create or replace function public.guardar_horas_grilla(
  p_event_slug text,
  p_horas jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
begin
  update public.inscripciones i
     set salida_hora = h.hora::time
    from jsonb_to_recordset(p_horas) as h(id uuid, hora text)
   where i.id = h.id
     and i.event_slug = p_event_slug;

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

-- Las ejecuta el service role desde los endpoints del panel; nunca anon.
revoke execute on function public.sortear_grilla(text) from public, anon;
revoke execute on function public.guardar_horas_grilla(text, jsonb)
  from public, anon;

comment on function public.sortear_grilla(text) is
  'Sortea el turno de salida dentro de cada categoría entre las inscripciones verificadas del evento. Devuelve cuántas quedaron con turno.';
comment on function public.guardar_horas_grilla(text, jsonb) is
  'Escribe las horas de salida calculadas por la aplicación. p_horas: [{id, hora}].';
