-- Migración 0006: datos bancarios editables desde el panel.
-- Antes vivían en el config del evento (código), lo que obligaba a
-- redesplegar para cambiar una cuenta. Una fila por evento.

create table if not exists public.evento_datos_pago (
  event_slug             text primary key,
  /** false oculta el paso de pago del modal sin borrar los datos */
  activo                 boolean not null default true,
  banco                  text not null,
  tipo_cuenta            text not null,
  numero_cuenta          text not null,
  titular                text not null,
  identificacion_titular text not null,
  monto                  text not null,
  intro                  text,
  notas                  text[] not null default '{}',
  updated_at             timestamptz not null default now(),
  updated_by             uuid references auth.users(id)
);

-- RLS igual que el resto del módulo: sin acceso anónimo.
-- El sitio público lee por un Route Handler con service role que expone
-- solo los campos visibles; el panel lee y escribe como admin autenticado.
alter table public.evento_datos_pago enable row level security;

drop policy if exists "admin del evento lee datos de pago" on public.evento_datos_pago;
drop policy if exists "admin del evento edita datos de pago" on public.evento_datos_pago;
drop policy if exists "admin del evento crea datos de pago" on public.evento_datos_pago;

create policy "admin del evento lee datos de pago"
  on public.evento_datos_pago for select
  to authenticated
  using (public.is_event_admin(event_slug));

create policy "admin del evento edita datos de pago"
  on public.evento_datos_pago for update
  to authenticated
  using (public.is_event_admin(event_slug));

create policy "admin del evento crea datos de pago"
  on public.evento_datos_pago for insert
  to authenticated
  with check (public.is_event_admin(event_slug));
