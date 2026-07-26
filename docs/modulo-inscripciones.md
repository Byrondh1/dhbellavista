# Módulo propio de inscripciones

Estado de implementación (plan completo aprobado — ver fases A-D):

- **M1 — HECHO**: modal con formulario (hash `#inscribirse`, deep-linkeable),
  endpoint `POST /api/inscripciones` con validación zod + honeypot, guardado
  en Supabase, subida de comprobante al bucket privado, esquema SQL con RLS.
- **Fase A — HECHO** (endurecimiento): consentimiento LOPDP obligatorio
  (checkbox + texto versionado persistido), rate limiting por IP (hash con
  salt, máx. 5/hora), verificación de magic bytes del comprobante, migración
  0002 con `is_event_admin()` (preparada para multi-tenancy) y
  `verificar_inscripcion()` (dorsal secuencial por categoría, atómico).
- **Fase B — HECHO**: proyecto Supabase real, migraciones ejecutadas,
  usuario admin creado y Downhill en `mode: "modal"`.
- **Fase C — HECHO**: panel admin (@supabase/ssr, login, lista con filtros,
  comprobante por URL firmada, verificar/rechazar).
- **Fase D1 — HECHO**: Correo 1 ("inscripción recibida, pago pendiente")
  con PDF provisional adjunto, enviado desde `/api/inscripciones`.
- **Fase D2 — HECHO**: Correo 2 ("inscripción confirmada") con PDF
  definitivo (dorsal + QR firmado), página `/admin/checkin` con "marcar
  presente", y botón de reenviar correo en el panel.
- **Fase D3 — HECHO**: correo al rechazar, en tono "acción requerida"
  (invita a corregir el comprobante y reintentar) con el motivo escrito
  por el admin y CTA de WhatsApp. **El módulo está completo.**

> ⚠ El motivo del rechazo que se escribe en el panel **se le envía tal cual
> al participante**. Redáctalo como un mensaje para él, no como nota
> interna. El panel lo exige (mínimo 10 caracteres) porque un correo de
> "revisa tu inscripción" sin explicación no sirve de nada.

## Cómo activar las inscripciones en línea (por evento)

1. Crear el proyecto en [supabase.com](https://supabase.com) y ejecutar
   **todas** las migraciones de `supabase/migrations/` en orden en el SQL
   Editor (una sola vez, sirve para todos los eventos). La 0003 es de
   seguridad: deja el bucket de comprobantes privado con límites de tamaño
   y MIME, y elimina cualquier policy pública que se haya creado a mano.
   Verifica después con:
   `select policyname, roles, cmd from pg_policies
    where schemaname = 'storage' and tablename = 'objects';`
   — debe quedar solo "admin del evento ve comprobantes" ({authenticated},
   SELECT) para este bucket.
2. En el proyecto de Vercel del evento, definir `SUPABASE_URL` y
   `SUPABASE_SERVICE_ROLE_KEY` (Settings → API del proyecto Supabase).
3. En el config del evento, cambiar `registrationCta.mode` a `"modal"` y
   ajustar `registrationForm` (campos, comprobante, `privacyNote`).
4. Para cerrar inscripciones: `registrationForm.closed: true`.

Si Supabase no está configurado y el modo es `"modal"`, el endpoint responde
503 con un mensaje que redirige a WhatsApp — el sitio no se rompe.

## Correos (Resend)

Variables de servidor: `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` (la dirección;
el nombre visible del remitente sale del config del evento), `QR_SECRET`
(firma del QR de check-in; generar con `openssl rand -hex 32`) y, opcional,
`EMAIL_TEST_REDIRECT` para desviar todos los correos a una dirección de
prueba.

Los tres correos del módulo:

| Cuándo | Asunto | Adjunto | Timestamp |
|---|---|---|---|
| Al inscribirse | Inscripción recibida | PDF provisional | `correo_recibida_at` |
| Al verificar el pago | ¡Inscripción confirmada! | PDF con dorsal + QR | `correo_confirmada_at` |
| Al rechazar | Revisa tu inscripción | — | `correo_rechazo_at` |

Ningún correo decide el destino de una inscripción: si Resend falla, la
inscripción se guarda / verifica / rechaza igual, el panel muestra el correo
como "no enviado" y ofrece **Reenviar correo** (reenvía el que corresponda
al estado actual). Sin `QR_SECRET`, el PDF definitivo se emite sin QR (queda
registrado en los logs) en lugar de fallar.

Todo el módulo loguea con el prefijo `[inscripciones]`: para depurar un
envío, filtra por ahí en la terminal o en los logs de Vercel. Para
diagnosticar la cadena completa contra la base real:
`npm run diagnose:downhill -- <id> [--enviar] [--marcar]`.

Rechazar limpia `dorsal`, `verificada_at` y `correo_confirmada_at`: si la
persona corrige y se vuelve a verificar, recibe un dorsal nuevo y su Correo
2 se envía otra vez.

Tope del plan gratuito de Resend: 100 correos/día. Si se agota en un pico de
inscripciones, los correos no enviados se recuperan con el botón de reenviar.

## Check-in del día del evento

El QR del PDF definitivo apunta a `<sitio>/admin/checkin?t=<token>`, donde el
token lleva id + evento + dorsal firmados con HMAC-SHA256. Al escanearlo con
la cámara del celular (con sesión de admin iniciada) se abre la ficha del
participante con su dorsal y el botón **Marcar presente**, que registra
`asistio_at` de forma idempotente. Un QR alterado o de otro evento muestra
"QR no válido"; si la inscripción dejó de estar verificada, lo advierte y
enlaza al panel.

## Alcance completo del módulo

1. Botón sticky "Inscribirse" abre un **modal** con formulario: nombre,
   cédula, categoría (desde `EventConfig.categories`), ciudad, teléfono,
   contacto de emergencia, club opcional.
2. Subida del **comprobante de transferencia** a Supabase Storage.
3. Guardado en **Supabase** con RLS (se recogen cédulas).
4. **Correo 1** (Resend) al enviar: "inscripción recibida, pago pendiente de
   verificación" + PDF provisional (`@react-pdf/renderer`).
5. **Panel admin** para revisar comprobantes y verificar/rechazar.
6. **Correo 2** al verificar: PDF definitivo con dorsal, categoría y QR para
   el check-in del día del evento.

## Decisiones ya tomadas en la plantilla (vigentes hoy)

### Modo de Next.js: build estándar, NO `output: 'export'`

La plantilla usa `next build` normal desplegado en Vercel. Todas las páginas
actuales se prerenderizan estáticas (mismo rendimiento que un export), pero el
proyecto **admite Route Handlers, Server Actions y páginas dinámicas** en
cuanto se necesiten. No hay nada que migrar cuando llegue el módulo.
Consecuencia asumida: el evento que active el módulo no podrá desplegarse en
GitHub Pages (solo Vercel u otro host con runtime Node).

### CTA de inscripción con modo configurable

`EventConfig.registrationCta.mode: "whatsapp" | "modal"`. Todos los botones
de inscripción (hero, sticky, sección de costos) resuelven su destino en
`lib/registration.ts` → `registrationHref()`. Hoy solo existe el
comportamiento `"whatsapp"`; al implementar el modal bastará:

1. Implementar el disparador del modal en `StickyRegistrationCta` y
   `RegistrationCtaButton` para `mode === "modal"`.
2. Cambiar `mode` en el config del evento.

Ningún otro componente conoce el mecanismo de inscripción.

### Botón sticky

`components/ui/StickyRegistrationCta.tsx` ya existe y está en el layout de la
página (visible durante todo el scroll). El módulo solo cambia su acción, no
el layout.

## Dónde encajará cada pieza

| Pieza | Ubicación prevista |
|---|---|
| Modal + formulario | `components/registration/RegistrationModal.tsx` (client), montado desde los CTAs cuando `mode === "modal"` |
| Endpoint de inscripción | `app/api/inscripciones/route.ts` (Route Handler POST): valida, guarda en Supabase, sube comprobante, dispara Correo 1 |
| Clientes Supabase | `lib/supabase/` — cliente browser (anon) solo para lo mínimo; operaciones sensibles siempre server-side con service role |
| Generación de PDFs | `lib/pdf/` con `@react-pdf/renderer`, ejecutado en Route Handlers (server) |
| Correos | `lib/email.ts` con Resend, solo server-side |
| Panel admin | `app/admin/` (páginas dinámicas protegidas con Supabase Auth) |
| Verificar/rechazar | `app/api/admin/inscripciones/[id]/route.ts` → actualiza estado, genera PDF definitivo con dorsal + QR, dispara Correo 2 |

## Datos y seguridad (lineamientos)

- Tabla `inscripciones` con columna `event_slug`: un solo proyecto Supabase
  sirve a todos los eventos; cada sitio filtra por su slug.
- Estados: `pendiente` → `verificada` | `rechazada`. Dorsal se asigna al
  verificar.
- RLS: sin lectura anónima (hay cédulas). Insert vía Route Handler con
  service role (o política de solo-insert anónima, a decidir). El panel admin
  lee con usuario autenticado.
- Storage: bucket privado para comprobantes; acceso desde el admin con URLs
  firmadas de corta duración.
- QR del PDF definitivo: firmar el payload (id + dorsal + slug) con secreto
  del servidor para poder validar en el check-in sin conexión a la base.
- Secretos (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`) como env vars del
  proyecto Vercel, **nunca** `NEXT_PUBLIC_*` ni en el config del evento.
