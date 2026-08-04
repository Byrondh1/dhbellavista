# Plantilla de landing pages para eventos deportivos — EB Corp

Una sola base de código (Next.js + Tailwind) que genera **un sitio
independiente por evento**, cada uno con su marca, dominio y despliegue
propio. Todo el contenido, colores, fotos y links salen del archivo de
config del evento — los componentes no conocen ningún evento.

Eventos actuales:

| Slug | Evento | Club |
|---|---|---|
| `downhill-la-cantera-2026` | Downhill Bella Vista 2026 | Remnant EB |
| `rodada-angelena-4x4-2026` | Rodada Angeleña 4x4 2026 | 4L Off Road Club |

## Desarrollo

```bash
npm install
npm run dev:downhill   # o dev:rodada
```

El evento activo se elige con `NEXT_PUBLIC_EVENT=<slug>` (los scripts npm ya
la definen). Builds de producción: `npm run build:downhill` / `build:rodada`.

`npm install` instala además un **hook de pre-commit** (apunta
`core.hooksPath` a `.githooks/`, sin dependencias).

## Cómo crear un nuevo evento

1. Copia una carpeta de `content/events/` con el nuevo slug y edita su
   `config.ts` (tipos en `lib/types.ts` — el editor autocompleta todo).
2. Reemplaza las imágenes de `content/events/<slug>/images/` por las reales.
3. Si hay GPX, PDF de reglamento o afiche OG, ponlos en
   `public/events/<slug>/` y referencia sus rutas en el config.
4. Registra el config en `lib/event.ts`.
5. Agrega scripts `dev:`/`build:` en `package.json` (opcional, por comodidad).
6. Crea el proyecto en Vercel (ver abajo).

## Estructura

```
app/                  Layout, página única, sitemap, robots, favicon generado
components/sections/  Una sección por componente (Hero, About, Route, …)
components/map/       Mapa del recorrido (iframe o Leaflet+GPX, carga diferida)
components/ui/        Piezas compartidas (botones, CTA de inscripción, Reveal…)
content/events/       Config + imágenes de cada evento (la única "base de datos")
lib/                  Tipos, registro de eventos, tema, SEO, JSON-LD, CTA
public/events/        Assets servidos tal cual: GPX, PDF, imagen OG
scripts/              Generador de placeholders e Ignored Build Step
docs/                 Diseño del futuro módulo de inscripciones
```

Reglas de la plantilla:

- **Nada de contenido de eventos en componentes.** Si un texto o color es de
  un evento, va al config.
- Colores solo vía clases semánticas (`bg-primary`, `text-muted`…). La
  paleta se inyecta como CSS variables desde el config (`lib/theme.ts`).
- Secciones opcionales: si el config no define una sección, no se renderiza.

## Imágenes

- Fotos: deja el archivo en `content/events/<slug>/images/` con el nombre que
  indica el README de esa carpeta y corre **`npm run fotos`**: redimensiona,
  comprime y convierte a WebP. `next/image` hace el resto (lazy, blur, y la
  versión del ancho de cada pantalla).
- **El pre-commit rechaza imágenes cuya extensión miente sobre su formato**
  (por ejemplo un PNG renombrado a `.webp`, que es lo que pasa al renombrar
  en vez de convertir). Dice qué archivo y qué formato es en realidad; se
  arregla con `npm run fotos`. Para saltarlo en un commit puntual:
  `git commit --no-verify`. A mano, sobre archivos concretos:
  `npm run verificar:imagenes -- ruta/al/archivo.webp`.
- Open Graph (`public/events/<slug>/og.png`): **1200×630 y menos de 300 KB**
  — es la vista previa al compartir por WhatsApp.
- Los placeholders actuales se regeneran con `npm run placeholders`.

## Despliegue (Vercel)

Un proyecto de Vercel por evento, ambos apuntando a este repo:

| Ajuste | Valor |
|---|---|
| Build Command | (default: `next build`) |
| Env `NEXT_PUBLIC_EVENT` | slug del evento |
| Env `NEXT_PUBLIC_SITE_URL` | dominio final, ej. `https://downhill.midominio.ec` (omitir mientras se usa `*.vercel.app`) |
| Ignored Build Step (opcional) | `node scripts/vercel-ignore-build.mjs` — evita redeployar un evento cuando el commit solo toca contenido de otro |

Dominios: al comprar el dominio, agregar el subdominio al proyecto en Vercel,
crear el registro DNS y definir `NEXT_PUBLIC_SITE_URL`. Metadata, Open Graph,
sitemap y JSON-LD lo toman de ahí (`lib/site-url.ts`) — nada hardcodeado.

Google Analytics: definir `gaId` en el config del evento (`site.gaId`). Solo
se carga en producción.

## Módulo de inscripciones (futuro)

El CTA de inscripción es configurable (`registrationCta.mode`): hoy
`"whatsapp"`; `"modal"` queda reservado para el módulo propio con Supabase,
comprobantes y correos. El diseño completo está en
[`docs/modulo-inscripciones.md`](docs/modulo-inscripciones.md).
