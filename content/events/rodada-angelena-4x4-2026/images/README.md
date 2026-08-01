# Fotos de la Rodada Angeleña 4x4 2026

Deja aquí las fotos **con estos nombres exactos** (en JPG, PNG, WebP o HEIC
del iPhone — da igual) y corre desde la raíz del repo:

```bash
npm run fotos -- rodada
```

El script las redimensiona, las comprime, las convierte a `.webp` y borra el
original. Después: `git add`, commit y push.

## Nombres exactos

| Archivo | Dónde sale | Ancho que se guarda |
|---|---|---|
| `hero.jpg` | Fondo de la portada (pantalla completa) | 1920 px |
| `about.jpg` | Sección "Sobre el evento" | 1280 px |
| `gallery-1.jpg` … `gallery-N.jpg` | Galería (numeradas, sin saltarse números) | 1600 px |
| `logo-club.png` | Logo del 4L Off Road Club (portada y pie) | 512 px |
| `sponsor-1.png` … `sponsor-5.png` | Logos de auspiciantes | 512 px |
| `texture-tread.png` | Textura de banda de rodadura del tema | 1024 px |

La extensión que dejes no importa: el resultado siempre es `<nombre>.webp`.

Esta rodada **no usa** `track-1` / `track-2`: su sección Recorrido muestra el
mapa del GPX, no fotos.

## Galería

- Van **numeradas desde 1 y sin huecos**: `gallery-1`, `gallery-2`, …
- El script regenera `galeria.ts` con las que existan, así que **agregar o
  quitar fotos no requiere tocar código**.
- Si borras todas, la sección Galería simplemente no aparece.
- Entre **6 y 12** funcionan bien. Menos de 4 se ve pobre; más de 12 alarga
  mucho la página en el celular sin que nadie las mire.
- Formato horizontal (4:3 o 16:9): el grid recorta a 4:3.

## Textos alternativos

`galeria-alt.json` tiene el texto que describe cada foto — lo leen los
lectores de pantalla y Google. Edítalo cuando cambies las fotos y vuelve a
correr `npm run fotos`. Si una foto no está en el JSON, se le pone un texto
genérico.

## Reglas para que nada se rompa

- **No borres `hero.webp`, `about.webp`, `logo-club.webp`, `texture-tread.webp`
  ni los `sponsor-*.webp`**: el código los importa directamente y el build
  falla si faltan. Para cambiarlos, **sobreescríbelos** (deja la foto nueva
  con el mismo nombre y corre el script).
- Las de galería sí se pueden borrar libremente.
- El afiche que se ve al compartir por WhatsApp **no va aquí**: va en
  `public/events/rodada-angelena-4x4-2026/og.png`, 1200×630.
