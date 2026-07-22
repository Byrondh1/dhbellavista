# Módulo propio de inscripciones

Estado de implementación:

- **M1 — HECHO**: modal con formulario (hash `#inscribirse`, deep-linkeable),
  endpoint `POST /api/inscripciones` con validación zod + honeypot, guardado
  en Supabase, subida de comprobante al bucket privado, esquema SQL con RLS.
- **M2 — pendiente**: Correo 1 con Resend + PDF provisional
  (hook marcado con `TODO(M2)` en el endpoint).
- **M3 — pendiente**: panel admin, verificar/rechazar, Correo 2 con dorsal
  y QR.

## Cómo activar las inscripciones en línea (por evento)

1. Crear el proyecto en [supabase.com](https://supabase.com) y ejecutar
   `supabase/schema.sql` en el SQL Editor (una sola vez, sirve para todos
   los eventos).
2. En el proyecto de Vercel del evento, definir `SUPABASE_URL` y
   `SUPABASE_SERVICE_ROLE_KEY` (Settings → API del proyecto Supabase).
3. En el config del evento, cambiar `registrationCta.mode` a `"modal"` y
   ajustar `registrationForm` (campos, comprobante, `privacyNote`).
4. Para cerrar inscripciones: `registrationForm.closed: true`.

Si Supabase no está configurado y el modo es `"modal"`, el endpoint responde
503 con un mensaje que redirige a WhatsApp — el sitio no se rompe.

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
