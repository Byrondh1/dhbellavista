-- Migración 0008: eventos que se identifican por PLACA y no por dorsal, y
-- que no clasifican por categoría (Rodada Angeleña 4x4).
--
-- Aditiva: se puede ejecutar con el downhill en producción recibiendo
-- inscripciones. Sus filas quedan con placa/copiloto nulos y siguen
-- enviando categoría, así que nada de lo suyo cambia de comportamiento.

alter table public.inscripciones
  -- Identificador de la rodada: lo trae el participante, no lo asigna el
  -- sistema. Se guarda normalizado en mayúsculas (ej. PCX-1234).
  add column if not exists placa text,
  -- Nombre del copiloto. Lleno = el vehículo va con dos personas, lo que
  -- define si el kit de alimentación es para uno o para dos.
  add column if not exists copiloto text;

-- Un vehículo, una inscripción por evento: la rodada se cobra por vehículo y
-- la placa es el código de acreditación, así que no puede repetirse.
-- El índice es PARCIAL y case-insensitive: las filas del downhill (placa
-- nula) quedan fuera y no pueden colisionar.
create unique index if not exists inscripciones_placa_unica
  on public.inscripciones (event_slug, upper(placa))
  where placa is not null;

-- Eventos sin categorías: la columna deja de ser obligatoria. Relajar una
-- restricción no invalida ninguna fila existente.
alter table public.inscripciones alter column categoria drop not null;

-- ── Verificar con o sin asignación de dorsal ────────────────────────────
-- Hay que DROP antes de crear: agregarle un parámetro con default crea una
-- segunda función en vez de reemplazarla, y una llamada con un solo
-- argumento quedaría ambigua.
drop function if exists public.verificar_inscripcion(uuid);

create or replace function public.verificar_inscripcion(
  p_id uuid,
  -- true (default) = comportamiento histórico: dorsal secuencial por
  -- categoría. false = solo confirma (la rodada ya tiene su placa).
  p_con_dorsal boolean default true
)
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

  if p_con_dorsal then
    -- Advisory lock por (evento, categoría): evita dorsales duplicados si se
    -- verifican dos inscripciones a la vez. coalesce por si la categoría es
    -- nula (hashtext(null) no sirve como clave de lock).
    perform pg_advisory_xact_lock(
      hashtext(v.event_slug || '|' || coalesce(v.categoria, ''))
    );

    select coalesce(max(dorsal), 0) + 1
      into v_dorsal
      from public.inscripciones
     where event_slug = v.event_slug
       -- `is not distinct from` y no `=`: con categoría nula, `=` nunca es
       -- verdadero y la numeración se reiniciaría en cada verificación.
       and categoria is not distinct from v.categoria;
  else
    v_dorsal := null;
  end if;

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
revoke execute on function public.verificar_inscripcion(uuid, boolean)
  from public, anon;
