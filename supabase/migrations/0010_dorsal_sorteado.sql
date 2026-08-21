-- Migración 0010: dorsal sorteado con cupo duro.
--
-- Hasta ahora el dorsal era secuencial POR CATEGORÍA (max+1), así que el
-- número 1 existía en Infantil y también en Élite. El downhill pasa a un
-- sorteo 1..N único en TODO el evento: el 47 lo lleva una sola persona.
--
-- Se ejecuta con la tabla sin dorsales asignados en el downhill (verificado
-- antes de escribir esto). Si hubiera dorsales repetidos entre categorías, el
-- índice único nuevo fallaría al crearse — y es mejor que falle aquí, en una
-- migración, que producir dos corredores con el mismo número en la pista.

-- ── 1. El dorsal pasa a ser único por evento, no por evento+categoría ─────
drop index if exists public.inscripciones_dorsal_unico;

create unique index if not exists inscripciones_dorsal_unico
  on public.inscripciones (event_slug, dorsal)
  where dorsal is not null;

-- ── 2. La asignación ─────────────────────────────────────────────────────
-- Misma firma de siempre más un parámetro: el cupo. Con p_cupo null se
-- mantiene el comportamiento secuencial anterior, que es lo que necesita
-- cualquier evento sin sorteo. Un solo lugar donde se asigna el número, lo
-- llame el alta presencial o la confirmación de un pago online.
--
-- Se puede correr con el sitio en producción: el parámetro nuevo tiene
-- default, y PostgREST resuelve las llamadas por nombre de argumento, así que
-- el código desplegado hoy —que manda solo p_id y p_con_dorsal— sigue
-- funcionando contra esta función mientras se despliega el nuevo.
drop function if exists public.verificar_inscripcion(uuid, boolean);

create or replace function public.verificar_inscripcion(
  p_id uuid,
  p_con_dorsal boolean default true,
  -- Sortear entre 1 y este número. Null = numeración secuencial (legado).
  p_cupo integer default null
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
    if p_cupo is not null then
      -- Lock por EVENTO: el espacio de números es común a las categorías, así
      -- que dos confirmaciones simultáneas de categorías distintas también
      -- pueden chocar.
      perform pg_advisory_xact_lock(hashtext(v.event_slug));

      -- Un número al azar entre los que siguen libres. order by random() sobre
      -- 100 filas es intrascendente, y deja el sorteo dentro de la misma
      -- transacción que el lock: nadie puede colarse en el medio.
      select n into v_dorsal
        from generate_series(1, p_cupo) as n
       where not exists (
         select 1
           from public.inscripciones
          where event_slug = v.event_slug
            and dorsal = n
       )
       order by random()
       limit 1;

      if v_dorsal is null then
        -- Lo captura el endpoint para decir "cupo lleno" en lugar de un error
        -- de base de datos incomprensible.
        raise exception 'CUPO_LLENO' using errcode = 'P0001';
      end if;
    else
      -- Sin cupo: secuencial, para eventos sin sorteo.
      --
      -- Antes esto numeraba por categoría (el 1 existía en Infantil y otra
      -- vez en Élite). Ya no puede: el índice de arriba hace el dorsal único
      -- en todo el evento, y numerar por categoría chocaría con él en cuanto
      -- un evento tuviera dos. La numeración corre por evento y punto.
      perform pg_advisory_xact_lock(hashtext(v.event_slug));
      select coalesce(max(dorsal), 0) + 1
        into v_dorsal
        from public.inscripciones
       where event_slug = v.event_slug;
    end if;
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
revoke execute on function public.verificar_inscripcion(uuid, boolean, integer)
  from public, anon;

comment on function public.verificar_inscripcion(uuid, boolean, integer) is
  'Confirma una inscripción y le asigna dorsal, único en todo el evento. Con p_cupo lo sortea entre 1 y ese número y falla con CUPO_LLENO al agotarse; sin p_cupo numera secuencialmente (max+1).';
