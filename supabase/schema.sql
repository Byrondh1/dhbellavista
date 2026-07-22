-- Esquema del módulo de inscripciones. Ejecutar en el SQL Editor de Supabase
-- (una sola vez por proyecto; sirve para todos los eventos vía event_slug).

create table if not exists public.inscripciones (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  nombre text not null,
  email text not null,
  cedula text,
  categoria text not null,
  ciudad text,
  telefono text not null,
  emergencia_nombre text,
  emergencia_telefono text,
  club text,
  comprobante_path text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'verificada', 'rechazada')),
  dorsal integer,
  created_at timestamptz not null default now(),
  -- una inscripción por cédula por evento
  unique (event_slug, cedula)
);

-- RLS: la tabla contiene cédulas — cero acceso anónimo.
-- El endpoint del sitio escribe con el service role (salta RLS);
-- el panel admin (M3) leerá/actualizará como usuario autenticado.
alter table public.inscripciones enable row level security;

create policy "admin autenticado lee"
  on public.inscripciones for select
  to authenticated
  using (true);

create policy "admin autenticado actualiza"
  on public.inscripciones for update
  to authenticated
  using (true);

-- Bucket PRIVADO para comprobantes de transferencia.
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

create policy "admin autenticado ve comprobantes"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'comprobantes');
