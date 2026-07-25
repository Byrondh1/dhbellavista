-- Migración 0003: endurecimiento del bucket de comprobantes.
--
-- Motivo: se reportó lectura pública de un comprobante. Esta migración es
-- defensiva e idempotente — deja el bucket en el estado correcto sin
-- importar qué policies o flags se hayan tocado a mano:
--   1. Bucket privado + límites de tamaño y MIME a nivel de API de Storage
--      (aplican a TODOS los roles, incluido service_role).
--   2. Elimina cualquier policy que dé acceso a anon/public sobre el bucket
--      (incluidas las de plantilla del dashboard, de nombre desconocido).
--   3. Recrea la única policy legítima: lectura solo para authenticated
--      vía is_event_admin.
-- La subida no necesita policy: solo la hace el endpoint con service_role.

-- ── 1. Bucket privado con límites de API ────────────────────────────────
-- Lista de MIME explícita, idéntica al whitelist del endpoint
-- (lib/registration-schema.ts): más estricta y auditable que 'image/*'.
update storage.buckets
   set public = false,
       file_size_limit = 5242880, -- 5 MB, igual que COMPROBANTE_MAX_BYTES
       allowed_mime_types = array[
         'image/jpeg',
         'image/png',
         'image/webp',
         'application/pdf'
       ]
 where id = 'comprobantes';

-- ── 2. Purga de policies permisivas sobre el bucket ─────────────────────
-- Dropea toda policy de storage.objects que otorgue acceso a anon o public
-- y que (a) mencione el bucket comprobantes, o (b) sea un using(true)
-- global que también lo alcanzaría.
do $$
declare
  p record;
begin
  for p in
    select policyname
      from pg_policies
     where schemaname = 'storage'
       and tablename = 'objects'
       and ('anon' = any (roles) or 'public' = any (roles))
       and (
         coalesce(qual, '') ilike '%comprobantes%'
         or coalesce(with_check, '') ilike '%comprobantes%'
         or coalesce(qual, '') = 'true'
       )
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
    raise notice 'Policy permisiva eliminada: %', p.policyname;
  end loop;
end;
$$;

-- ── 3. Única policy legítima de lectura (idempotente) ───────────────────
drop policy if exists "admin del evento ve comprobantes" on storage.objects;

create policy "admin del evento ve comprobantes"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'comprobantes'
    and public.is_event_admin(split_part(name, '/', 1))
  );
