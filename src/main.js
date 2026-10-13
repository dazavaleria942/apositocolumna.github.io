import { SceneManager } from './scenes/SceneManager.js';
import { World } from './scenes/World.js';
import { Annotations } from './components/Annotations.js';
import { Hud } from './components/Hud.js';
import { ViewControls, StepDock } from './components/Controls.js';
import { Panel } from './components/Panel.js';
import { TopBar, Overlays } from './components/Shell.js';
import { h } from './components/dom.js';
import { icon } from './components/icons.js';
import { App } from './app/App.js';
import { VIEWS } from './animations/helpers.js';
import { APP_TEXT } from './data/stages.js';

async function boot() {
  const root = document.getElementById('app');
  const viewport = h('section', { class: 'viewport', 'aria-label': 'Simulador 3D' });
  const stageHost = h('div', { class: 'stage-host' });
  viewport.append(stageHost);
  const main = h('main', { class: 'layout' }, viewport);
  root.append(main);

  const overlays = new Overlays(viewport);
  let sm;
  try {
    sm = new SceneManager(stageHost);
  } catch (err) {
    overlays.setLoading(0, 'Este navegador no puede iniciar WebGL. Active la aceleración por hardware o use un navegador actualizado.');
    console.error(err);
    return;
  }

  const world = new World(sm);
  await world.build((p, msg) => overlays.setLoading(p, msg));

  // Zonas del visor ocupadas por controles (las etiquetas 3D las evitan)
  const reserves = () => {
    const vr = viewport.getBoundingClientRect();
    const vc = viewport.querySelector('.view-controls');
    const dk = viewport.querySelector('.dock');
    const r = { top: 8, right: 8, bottom: 8, left: 8 };
    if (vc && vc.offsetWidth) {
      const b = vc.getBoundingClientRect();
      // Columna vertical: se reserva el borde derecho; fila horizontal: el borde superior
      if (b.height >= b.width) r.right = vr.right - b.left + 4;
      else r.top = b.bottom - vr.top + 4;
    }
    if (dk) r.bottom = vr.bottom - dk.getBoundingClientRect().top + 4;
    return r;
  };
  const anno = new Annotations(viewport, sm, { onSelect: (id) => app.selectInstrument(id), reserves });
  const hud = new Hud(viewport);
  const info = h('div', { class: 'viewport-info', hidden: true, role: 'dialog', 'aria-label': 'Información del instrumento' },
    h('button', { class: 'vi-close', type: 'button', 'aria-label': 'Cerrar', html: icon('close'), onclick: () => app.hideInfo() }),
    h('div', { class: 'vi-label' }, 'Nombre'),
    h('div', { class: 'vi-name' }),
    h('div', { class: 'vi-label' }, 'Función'),
    h('p', { class: 'vi-fn' }));
  viewport.append(info);

  let app;
  const controls = new ViewControls(viewport, {
    zoomIn: () => { sm.userOverride = true; sm.dolly(0.72); },
    zoomOut: () => { sm.userOverride = true; sm.dolly(1.38); },
    rotate: () => controls.setRotating(sm.toggleAutoRotate()),
    home: () => app.home(),
    center: () => app.center(),
  });
  sm.onAutoRotateChange = (on) => controls.setRotating(on);
  const dock = new StepDock(viewport, {
    prev: () => app.prev(),
    next: () => app.next(),
    toggle: () => app.toggle(),
    repeat: () => app.repeat(),
    goStep: (i) => app.goStep(i),
  });
  const panel = new Panel(main, {
    prev: () => app.prev(),
    next: () => app.next(),
    goStage: (i) => app.goStage(i),
    goStep: (i) => app.goStep(i),
    selectInstrument: (id) => app.selectInstrument(id),
    finish: () => app.finish(),
  });
  const topbar = new TopBar(root, { onStage: (i) => app.goStage(i) });
  panel.root.querySelector('.panel-foot').append(h('p', { class: 'disclaimer disclaimer-foot' }, APP_TEXT.disclaimer));

  app = new App({ sm, world, topbar, panel, dock, controls, hud, anno, overlays });
  app.infoEl = info;
  app.preview();
  window.__app = app;
  window.__sm = sm;
  window.__w = world;

  overlays.hideLoading();
  sm.camera.position.fromArray(VIEWS.intro().position);
  sm.controls.target.fromArray(VIEWS.intro().target);
  sm.flyTo(VIEWS.overview(), 3.2, 'power2.out');

  const params = new URLSearchParams(location.search);
  if (params.has('test')) {
    // Modo de prueba automatizada: renderizado más liviano
    document.body.classList.add('no-blur');
    sm.setQuality('balanced');
    sm.fixedQuality = true;
    sm.renderer.shadowMap.autoUpdate = false;
    sm.renderer.shadowMap.needsUpdate = true;
    if (params.get('test') === 'manual') {
      // Render solo bajo demanda (para capturas en entornos sin GPU)
      sm.renderer.setAnimationLoop(null);
      window.__frame = () => {
        sm.renderer.shadowMap.needsUpdate = true;
        sm.frame();
      };
    }
  }
  if (params.get('calidad') === 'baja') sm.setQuality('low');
  if (params.get('calidad') === 'alta') {
    sm.setQuality('high');
    sm.fixedQuality = true;
  }
  if (params.has('etapa')) {
    const i = Math.max(1, Math.min(6, Number(params.get('etapa')))) - 1;
    app.goStage(i);
  } else {
    overlays.showIntro(() => app.start());
  }
  window.__ready = true;
}

boot();
