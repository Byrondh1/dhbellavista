-- Migración 0004: seguimiento de correos y check-in (Fase D).
-- correo_recibida_at / correo_confirmada_at: cuándo salió cada correo
-- (null = no enviado → el panel ofrece reenviar).
-- asistio_at: check-in del día del evento vía QR (sub-fase D2).

alter table public.inscripciones
  add column if not exists correo_recibida_at timestamptz,
  add column if not exists correo_confirmada_at timestamptz,
  add column if not exists asistio_at timestamptz;
