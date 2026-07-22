-- Migración 0002: consentimiento LOPDP, rate limiting, dorsal por categoría
-- y autorización preparada para multi-tenancy. Ejecutar después de 0001.

-- ── Columnas nuevas ─────────────────────────────────────────────────────
-- (la tabla está vacía en instalaciones nuevas; el default temporal solo
-- protege una instancia que ya tuviera filas)
alter table public.inscripciones
  add column if not exists consentimiento_at timestamptz not null default now(),
  add column if not exists consentimiento_texto text not null default '',
  add column if not exists ip_hash text,
  add column if not exists verificada_at timestamptz,
  add column if not exists rechazada_at timestamptz,
  add column if not exists rechazo_motivo text;

alter table public.inscripciones
  alter column consentimiento_at drop default,
  alter column consentimiento_texto drop default;

-- ── Índices ─────────────────────────────────────────────────────────────
-- Dorsal único por evento+categoría (asignación secuencial por categoría)
create unique index if not exists inscripciones_dorsal_unico
  on public.inscripciones (event_slug, categoria, dorsal)
  where dorsal is not null;

create index if not exists inscripciones_estado_idx
  on public.inscripciones (event_slug, estado);

-- Rate limiting: búsqueda por hash de IP en ventana de tiempo
create index if not exists inscripciones_ip_hash_idx
  on public.inscripciones (ip_hash, created_at);

-- ── Autorización centralizada (preparada para multi-tenancy) ────────────
-- HOY: cualquier usuario autenticado (admin creado a mano) administra todo.
-- FUTURO multi-club: crear organizaciones/eventos/org_members y reemplazar
-- SOLO el cuerpo de esta función por el join de membresía. Las políticas y
-- tablas no cambian.
create or replace function public.is_event_admin(p_event_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'authenticated';
$$;

-- Reemplazar las políticas de 0001 por versiones basadas en la función
drop policy if exists "admin autenticado lee" on public.inscripciones;
drop policy if exists "admin autenticado actualiza" on public.inscripciones;

create policy "admin del evento lee"
  on public.inscripciones for select
  to authenticated
  using (public.is_event_admin(event_slug));

create policy "admin del evento actualiza"
  on public.inscripciones for update
  to authenticated
  using (public.is_event_admin(event_slug));

-- Storage: el path es <event_slug>/<id>.<ext>, así que el primer segmento
-- identifica el evento y el aislamiento aplica también a los archivos
drop policy if exists "admin autenticado ve comprobantes" on storage.objects;

create policy "admin del evento ve comprobantes"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'comprobantes'
    and public.is_event_admin(split_part(name, '/', 1))
  );

-- ── Verificación con dorsal secuencial por categoría ────────────────────
-- Atómica: el advisory lock por (evento, categoría) evita dorsales
-- duplicados si se verifican dos inscripciones a la vez. Idempotente: si ya
-- está verificada, devuelve la fila sin tocarla. Se invoca solo desde el
-- servidor (service role) tras validar la sesión del admin.
create or replace function public.verificar_inscripcion(p_id uuid)
returns public.inscripciones
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.inscripciones;
  v_dorsal integer;
begin
  select * into v from public.inscripciones where id = p_id for update;
  if not found then
    raise exception 'La inscripción % no existe', p_id;
  end if;
  if v.estado = 'verificada' then
    return v;
  end if;

  perform pg_advisory_xact_lock(hashtext(v.event_slug || '|' || v.categoria));

  select coalesce(max(dorsal), 0) + 1
    into v_dorsal
    from public.inscripciones
   where event_slug = v.event_slug
     and categoria = v.categoria;

  update public.inscripciones
     set estado = 'verificada',
         dorsal = v_dorsal,
         verificada_at = now(),
         rechazada_at = null,
         rechazo_motivo = null
   where id = p_id
   returning * into v;

  return v;
end;
$$;

-- La ejecutan solo el service role y admins autenticados; nunca anon
revoke execute on function public.verificar_inscripcion(uuid) from public, anon;
