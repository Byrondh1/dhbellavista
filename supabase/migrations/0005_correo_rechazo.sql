-- Migración 0005: seguimiento del correo de rechazo.
-- Simetría con correo_recibida_at / correo_confirmada_at: el panel muestra
-- si salió y permite reenviarlo.

alter table public.inscripciones
  add column if not exists correo_rechazo_at timestamptz;
