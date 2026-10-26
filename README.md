# Procedimiento de Columna — Tutorial Interactivo 3D

Simulación educativa paso a paso del procedimiento de instrumentación de columna y de la colocación del apósito quirúrgico. Aplicación web con un modelo 3D como elemento central (Three.js + GSAP), navegable por etapas y con animaciones específicas para cada paso.

> Contenido educativo. El procedimiento debe realizarse exclusivamente por personal capacitado y de acuerdo con los protocolos institucionales, indicaciones clínicas y especificaciones del fabricante.

## Cómo abrirlo

**Opción 1. Sin instalar nada:** doble clic en `dist/index.html`. Es un único archivo con todo incluido y funciona sin conexión.

**Opción 2. Con Node.js (recomendada para editar):** doble clic en `iniciar.bat`, o en una terminal dentro de esta carpeta:

```bash
npm start        # abre http://localhost:5173 en el navegador
```

No hace falta `npm install` para ejecutarlo: Three.js, GSAP y las fuentes ya están dentro del proyecto (`src/vendor`, `assets/fonts`).

Para regenerar `dist/index.html` después de modificar el código:

```bash
npm install      # solo la primera vez (instala esbuild)
npm run build
```

Parámetros útiles en la URL: `?etapa=6` abre directamente una etapa (1–7); `?pantalla=tv` fuerza el modo televisor; `?calidad=baja` usa la versión más liviana para equipos con poca capacidad gráfica; `?calidad=alta` fuerza la oclusión ambiental también en celulares. La calidad baja sola si la animación va lenta.

## Celulares y tablets

- **Vertical:** modelo 3D arriba e información abajo, con su propio desplazamiento; los botones Anterior/Continuar siempre visibles.
- **Horizontal:** modelo a la izquierda e información a la derecha.
- Gestos: un dedo rota, dos dedos acercan/alejan y desplazan.
- En equipos táctiles se desactiva la oclusión ambiental y se reduce la resolución interna para mantener la fluidez.
- Para abrirlo desde el celular en la misma red Wi‑Fi: `npm start` en el computador y luego `http://IP-DEL-COMPUTADOR:5173` en el celular.
- Seguimiento posquirúrgico en celular: los 8 días aparecen como tarjetas verticales con miniatura, título e indicador; la vista ampliada ocupa toda la pantalla.

## Computador y televisor

- **Computador:** modelo 3D ampliado a la izquierda y panel a la derecha; la vista ampliada del seguimiento muestra los 8 días en cuadrícula de tarjetas (o en pares silicona/algodón).
- **Televisor:** se activa solo en pantallas de 1900 × 1000 o más (por ejemplo, un TV a pantalla completa) o con `?pantalla=tv`. Textos y botones más grandes, mayor contraste y foco visible para manejar con control remoto o teclado (`Tab`, flechas, `Enter`). Botón de pantalla completa en el visor o tecla `F`.

## Publicar en GitHub Pages

El proyecto es un sitio estático: no necesita compilación ni servidor propio.

1. Cree un repositorio en GitHub (por ejemplo `Modelocolump`) y suba **todo el contenido de esta carpeta** a la raíz del repositorio, incluido el archivo oculto `.nojekyll`.
2. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)` → **Save**.
3. A los pocos minutos queda publicado en `https://USUARIO.github.io/Modelocolump/`.

Si el repositorio se llama exactamente `USUARIO.github.io`, el sitio queda en `https://USUARIO.github.io/`. Ambas opciones funcionan porque todas las rutas son relativas.

Notas:
- `.nojekyll` evita que GitHub procese el sitio con Jekyll.
- Los navegadores sin soporte de *import maps* (por ejemplo iPhone con iOS anterior a 16.4) pasan automáticamente a `dist/index.html`, la versión de un solo archivo.
- Después de modificar el código, ejecute `npm run build` antes de subir los cambios para mantener `dist/index.html` actualizado.

## Recorrido

| Etapa | Contenido | Pasos |
|---|---|---|
| 01 Materiales | Mesa de instrumental 3D por categoría; cada elemento se puede seleccionar (NOMBRE + FUNCIÓN) | 1.1–1.7 |
| 02 Asepsia y antisepsia | Higiene de manos, elementos de protección, campo estéril, antisepsia | 2.1–2.4 |
| 03 Limpieza de la herida | Recordatorio rápido en 5 pasos | 3.1–3.5 |
| 04 Técnica de ensamblaje | Vista anatómica: tornillos, medición, corte y doblado, barra, reducción, caps, torque, verificación | 4.1–4.8 |
| 05 Colocación del apósito | Higiene, revisión, campo, limpieza, secado, colocación, fijación, comprobación, registro | 5.1–5.9 |
| 06 Posquirúrgico | Evolución del apósito en 8 días consecutivos (silicona o algodón): estado del material, cambios visibles, entorno e indicador de revisión o cambio; vista ampliada para comparar los días; signos de alarma; pantalla de evaluación al final del día 8 | 6.1–6.8 |
| 07 Registro | Lista final, ejemplo completo marcado como «simulación educativa» y formulario de seguimiento; pantalla «Procedimiento completado» | 7.1 |

**Controles:** arrastrar para rotar, rueda para acercar, botones `+ − ↻ ⌂ 🎯` en el visor. Teclado: `←/→` paso anterior/siguiente, `Espacio` reproducir/pausar, `H` vista inicial, `C` centrar zona quirúrgica, `R` rotación automática, `F` pantalla completa.

## Estructura

```text
Modelocolump/
├── index.html               Entrada (import map hacia las dependencias locales)
├── iniciar.bat              Lanzador para Windows
├── package.json             Scripts: start, dev, build
├── scripts/
│   ├── serve.mjs            Servidor estático sin dependencias
│   └── build.mjs            Genera dist/index.html autocontenido
├── src/
│   ├── main.js              Arranque
│   ├── app/App.js           Navegación, línea de tiempo, progreso, selección
│   ├── scenes/              Renderizador, cámara, luces, quirófano y estado de la escena
│   ├── models/              Paciente, columna, implantes, instrumental, apósito, efectos
│   ├── animations/          Animaciones por etapa (GSAP)
│   ├── steps/               Une datos + estado inicial + animación de cada paso
│   ├── data/                Textos y estructura de todas las etapas (editable)
│   ├── components/          Interfaz: panel, barra de pasos, HUD, anotaciones
│   ├── styles/main.css      Estilos y tokens de diseño
│   ├── utils/               Geometría, texturas procedurales, matemáticas
│   └── vendor/              three.js r169 y GSAP 3.13 (sin CDN)
├── public/models/           Modelos GLB/GLTF opcionales + manifest.json
├── public/textures, images, animations
├── assets/fonts/            IBM Plex Sans (OFL)
└── dist/index.html          Versión de un solo archivo
```

## Editar contenido

Los textos no están dentro de los componentes visuales:

- `src/data/stages.js` — nombres de etapas, mensajes de «Etapa completada», aviso educativo.
- `src/data/materials.js` — categorías de material, elementos principales y secundarios.
- `src/data/instruments.js` — NOMBRE y FUNCIÓN de cada elemento seleccionable.
- `src/data/procedure.js` — pasos de asepsia, limpieza, ensamblaje (4.1–4.8), apósito (5.1–5.9) y campos del registro (7.1), con el ejemplo de simulación.
- `src/data/followup.js` — seguimiento posquirúrgico: los 8 días de cada material (título, indicador, cambios, entorno, texto y parámetros visuales del modelo), signos de alarma y textos de evaluación.

Cada paso tiene la forma:

```js
{ id: '4.1', title: 'Tornillos pediculares', text: 'Colocación de los tornillos…', animation: 'pedicle-screw-placement' }
```

La clave `animation` apunta a una función en `src/animations/`. El estado inicial de la escena de cada paso está en `src/steps/index.js`.

## Modelos 3D

Todos los modelos se generan por código (paciente en decúbito prono con bata y campo quirúrgico, columna L1–S1, tornillos poliaxiales, barras, caps, conectores, instrumental, gasas, apósito y campo estéril), de modo que el proyecto funciona sin archivos externos.

Para usar modelos propios `.glb`/`.gltf`, cópielos en `public/models/` y declárelos en `public/models/manifest.json` (ver `manifest.example.json`). Ejemplo:

```json
{
  "display:insertador": { "file": "insertador.glb", "scale": 1, "rotation": [-1.5708, 0, 0] }
}
```

Convenciones: unidades en metros; el paciente está sobre el eje X (cabeza hacia −X) con la espalda hacia +Y. Los modelos externos se cargan solo cuando el proyecto se sirve con `npm start` (los navegadores bloquean la lectura de archivos en `file://`).

## Criterios clínicos

- No se muestran valores de torque, dimensiones, medicamentos ni parámetros clínicos: aparecen como «Valor establecido por el fabricante» o «Según fabricante/protocolo institucional».
- La herida se representa cerrada, con grapas, sin sangre. La técnica de ensamblaje se muestra en vista anatómica translúcida.
- Los niveles instrumentados (L3–L5) son ilustrativos.
- Seguimiento posquirúrgico: los 8 días son un escenario ilustrativo para comparar, no una evolución universal ni un calendario de cambio. El momento del cambio depende de la herida, el tipo de apósito, las indicaciones clínicas y el fabricante. La gasa de algodón se marca para cambio en cuanto está húmeda, traspasada o despegada.
- El pus nunca se muestra como una etapa normal: solo aparece al marcar signos de alarma, junto con el aviso de valoración por un profesional sanitario sin esperar al día 8.
- Los datos del ejemplo de registro son ficticios y están marcados como «simulación educativa».

## Licencias de terceros

- three.js r169 — MIT (`src/vendor/three/LICENSE`)
- GSAP 3.13 — licencia estándar de GreenSock, gratuita
- IBM Plex Sans — SIL Open Font License (`assets/fonts/OFL-license.txt`)
