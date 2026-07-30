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

## Instrucciones de pago (primer paso del modal)

Los datos bancarios se editan desde el panel: **/admin/configuracion**
(enlace "Datos de pago" en la cabecera del panel). Se guardan en la tabla
`evento_datos_pago` de Supabase, una fila por evento, así que cambiar una
cuenta **no requiere tocar código ni redesplegar**.

Campos: banco, tipo de cuenta, número de cuenta, titular, cédula/RUC del
titular, monto, texto introductorio opcional y hasta 5 notas. El interruptor
"mostrar el paso de pago" lo apaga sin borrar los datos.

Cómo lo consume el sitio: al abrir el modal, el cliente pide
`GET /api/datos-pago` (sin caché, para que una edición se vea al instante).
Ese endpoint corre en servidor con service role, responde **solo** los campos
visibles —nunca `updated_by`/`updated_at`— y no acepta parámetros, así que
siempre devuelve los del evento de este build.

Comportamiento cuando no hay datos:

- **Sin fila o `activo=false`** → el modal abre directo en el formulario
  (nunca campos vacíos).
- **Si la lectura falla** → se muestra un aviso con botón de WhatsApp para
  pedir los datos, y la opción de continuar igual al formulario: un fallo de
  lectura jamás bloquea una inscripción.
- **Inscripciones cerradas** (`closed`) se evalúa antes que todo: no se
  muestran datos bancarios.

Los datos siguen sin aparecer en la landing pública (no están en el HTML, así
que no son indexables); la sección Costos sigue usando el texto libre de
`sections.pricing.paymentInfo`.

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

## Corregir errores de operación

**Verifiqué una inscripción por error** → botón **"Revertir verificación"**
en el detalle. En una sola operación vuelve a `pendiente`, libera el dorsal
y limpia `verificada_at`, `correo_confirmada_at` y `asistio_at`; desde ahí
puedes verificarla de nuevo o rechazarla con motivo. Nunca hay que tocar la
base a mano.

Dos comportamientos a tener en cuenta:

- **Revertir no envía ningún correo.** La persona conserva en su bandeja el
  PDF con el dorsal anterior. Si el caso lo amerita, avísale por WhatsApp o
  recházala con un motivo (eso sí manda correo).
- **El dorsal liberado no se reutiliza**: la numeración siempre toma
  `max(dorsal)+1` dentro de la categoría, así nunca circulan dos PDFs con el
  mismo número. Quedan huecos en la secuencia, y está bien.
- El QR viejo se invalida solo: `/admin/checkin` contrasta dorsal y estado
  contra la base, así que muestra "Inscripción no vigente".

Tope del plan gratuito de Resend: 100 correos/día. Si se agota en un pico de
inscripciones, los correos no enviados se recuperan con el botón de reenviar.

## Check-in y control de asistencia (día del evento)

**Vista de acreditación: `/admin/asistencia`** (botón "Control de asistencia"
en el panel). Es la pantalla para usar el día de la carrera, pensada para el
celular:

- Contadores arriba: **verificados**, **presentes** y **faltan**, con barra
  de avance.
- Búsqueda por dorsal, nombre o cédula, y filtros "solo los que faltan" /
  "solo presentes" / por categoría.
- Lista agrupada por categoría y ordenada por dorsal, con un botón grande por
  persona: **Marcar** si no ha llegado, o **✓ hora** si ya está presente
  (tocarlo de nuevo deshace el check-in, con confirmación, para corregir un
  escaneo equivocado).

Solo aparecen las inscripciones **verificadas**: son las únicas con dorsal.
Ojo: los dorsales son secuenciales *por categoría*, así que puede haber varios
"1" — por eso la lista se agrupa por categoría.

La asistencia también se ve por persona en el detalle de la inscripción
(sección "Correos y asistencia").

### Respaldo offline (imprescindible en el páramo)

En El Ángel la señal falla, y la vista digital necesita conexión. Antes de
subir:

- **Imprimir lista** (`/admin/asistencia/imprimir`): lista en papel agrupada
  por categoría, con columnas ☐ Llegó · Dorsal · Nombre (y club) · Cédula ·
  Firma. Sale en blanco y negro a propósito, no con el tema oscuro del
  evento: imprimirlo oscuro gastaría media tinta y quedaría ilegible. Cada
  categoría evita partirse entre páginas y el encabezado de tabla se repite.
- **Descargar CSV** (`/api/admin/inscripciones/export`): todas las
  inscripciones con todos los campos útiles. Separador **punto y coma** y BOM
  UTF-8, que es lo que Excel espera con configuración regional es-EC (con
  coma metería todo en una columna, y sin BOM rompería los acentos). Google
  Sheets detecta el separador solo. Si Excel lo abre en una sola columna,
  reimporta indicando "separado por punto y coma".
  Se omiten dos campos a propósito: `ip_hash` (hash de seguridad, inútil en
  una hoja) y `consentimiento_texto` (el mismo párrafo en cada fila haría el
  archivo inmanejable; queda la fecha de aceptación, que es la evidencia).

Flujo del día del evento: imprimes antes de subir, acreditas en papel
marcando las casillas, y al recuperar señal pasas las marcas al panel en
Control de asistencia. La lista impresa lleva datos personales (cédulas):
no la dejes sin supervisión.

### Acreditar escaneando el QR



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
