import { gsap } from 'gsap';
import { STAGES } from '../data/stages.js';
import { INSTRUMENTS } from '../data/instruments.js';
import { STAGE_STEPS, buildAnimation } from '../steps/index.js';
import { VIEWS } from '../animations/helpers.js';
import { frameDisplay } from '../animations/materials.js';
import * as THREE from 'three';

/**
 * Controlador del tutorial: navegación entre etapas y pasos, línea de tiempo de
 * cada animación, progreso, selección de instrumental y atajos de teclado.
 */
export class App {
  constructor({ sm, world, topbar, panel, dock, controls, hud, anno, overlays }) {
    Object.assign(this, { sm, world, topbar, panel, dock, controls, hud, anno, overlays });
    this.flat = [];
    STAGE_STEPS.forEach((steps, s) => steps.forEach((_, k) => this.flat.push({ s, k })));
    this.pos = 0;
    this.completed = new Set();
    this.tl = null;
    this.started = false;
    this.bindInput();
  }

  get current() {
    return this.flat[this.pos];
  }

  progress() {
    if (this.finished) return 1;
    return this.pos / this.flat.length;
  }

  stageStart(s) {
    return this.flat.findIndex((f) => f.s === s);
  }

  /** Muestra el panel del primer paso sin iniciar la animación (pantalla principal). */
  preview() {
    const { s, k } = this.current;
    this.renderUI(s, k);
    this.dock.setPlaying(false);
  }

  start() {
    this.started = true;
    this.goTo(0);
  }

  renderUI(s, k) {
    const steps = STAGE_STEPS[s];
    this.panel.render({
      stageIdx: s,
      stepIdx: k,
      steps,
      completed: this.completed,
      progress: this.progress(),
      isFirst: this.pos === 0,
      isLast: this.pos === this.flat.length - 1,
    });
    this.dock.render(steps, k, k);
    this.topbar.update(s, this.completed, this.progress());
    document.body.dataset.stage = STAGES[s].key;
  }

  goTo(index) {
    index = Math.max(0, Math.min(this.flat.length - 1, index));
    if (this.tl) {
      this.tl.kill();
      this.tl = null;
    }
    this.overlays.hideFinal();
    this.finished = false;
    this.pos = index;
    const { s, k } = this.current;
    const step = STAGE_STEPS[s][k];
    this.sm.userOverride = false;
    this.sm.cameraTween?.kill();
    this.sm.stopAutoRotate();
    this.anno.clear();
    this.hud.clear();
    this.hideInfo();
    this.world.applyState(step.state || {});
    if (s !== 0) this.panel.selected = null;
    this.renderUI(s, k);

    const tl = gsap.timeline({
      paused: true,
      onUpdate: () => this.dock.setProgress(tl.progress()),
      onComplete: () => this.onStepComplete(),
    });
    buildAnimation(step, this.ctx(), tl);
    this.tl = tl;
    this.dock.setProgress(0);
    this.play();
  }

  ctx() {
    return {
      world: this.world,
      sm: this.sm,
      hud: this.hud,
      anno: this.anno,
      ui: { panelTick: (i) => this.panel.tick(i) },
    };
  }

  onStepComplete() {
    this.dock.setPlaying(false);
    this.dock.setProgress(1);
  }

  play() {
    if (!this.tl) return;
    if (this.tl.progress() >= 1) return this.repeat();
    this.tl.play();
    this.dock.setPlaying(true);
  }

  pause() {
    this.tl?.pause();
    this.dock.setPlaying(false);
  }

  toggle() {
    if (!this.started) return this.beginFromIntro();
    if (!this.tl) return;
    if (this.tl.isActive()) this.pause();
    else this.play();
  }

  repeat() {
    if (!this.started) return;
    this.goTo(this.pos);
  }

  next() {
    if (!this.started) return this.beginFromIntro();
    const { s } = this.current;
    const isLastOfStage = this.pos === this.flat.length - 1 || this.flat[this.pos + 1].s !== s;
    if (isLastOfStage) {
      this.completed.add(s);
      const st = STAGES[s];
      if (this.pos === this.flat.length - 1) return this.finish();
      this.overlays.toast('ETAPA COMPLETADA', st.completion);
    }
    this.goTo(this.pos + 1);
  }

  prev() {
    if (!this.started) return;
    if (this.pos > 0) this.goTo(this.pos - 1);
  }

  goStage(i) {
    if (!this.started) {
      this.overlays.hideIntro();
      this.started = true;
    }
    // Las etapas anteriores se consideran revisadas al saltar hacia adelante
    for (let k = 0; k < i; k++) this.completed.add(k);
    this.goTo(this.stageStart(i));
  }

  goStep(k) {
    if (!this.started) return this.beginFromIntro();
    const { s } = this.current;
    this.goTo(this.stageStart(s) + k);
  }

  beginFromIntro() {
    this.overlays.hideIntro();
    this.start();
  }

  finish() {
    STAGES.forEach((_, i) => this.completed.add(i));
    this.finished = true;
    this.pause();
    this.topbar.update(this.current.s, this.completed, 1);
    this.panel.render({
      stageIdx: this.current.s,
      stepIdx: this.current.k,
      steps: STAGE_STEPS[this.current.s],
      completed: this.completed,
      progress: 1,
      isFirst: false,
      isLast: true,
    });
    STAGE_STEPS[5][0].checklist.forEach((_, i) => this.panel.tick(i));
    this.anno.clear();
    this.hud.clear();
    this.sm.flyTo(VIEWS.overview(), 1.6);
    setTimeout(() => this.sm.controls.autoRotate || (this.sm.controls.autoRotate = true), 1700);
    this.overlays.showFinal({
      onRestart: () => {
        this.completed.clear();
        this.goTo(0);
      },
      onAssembly: () => this.goStage(3),
      onDressing: () => this.goStage(4),
    });
  }

  // ------------------------------------------------------------------ cámara

  home() {
    this.sm.userOverride = true;
    this.sm.flyTo(VIEWS.overview(), 1.2);
  }

  center() {
    this.sm.userOverride = true;
    const s = this.current.s;
    this.sm.flyTo(s === 3 && this.world.patient.xray > 0.5 ? VIEWS.spine() : VIEWS.field(), 1.2);
  }

  // ------------------------------------------------------------------ selección de instrumental

  selectInstrument(id, { focus = true } = {}) {
    const info = INSTRUMENTS[id];
    if (!info) return;
    this.world.highlightDisplay([id]);
    this.panel.showInfo(id);
    this.showInfo(id);
    if (focus && this.world.display[id]) {
      this.sm.userOverride = true;
      if (this.tl?.isActive()) this.pause();
      this.sm.flyTo(frameDisplay(this.world, [id], { el: 0.92 }), 1.0);
    }
  }

  showInfo(id) {
    const info = INSTRUMENTS[id];
    const el = this.infoEl;
    if (!el) return;
    el.querySelector('.vi-name').textContent = info.name.toUpperCase();
    el.querySelector('.vi-fn').textContent = info.fn;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-in'));
  }

  hideInfo() {
    if (!this.infoEl) return;
    this.infoEl.classList.remove('is-in');
    this.infoEl.hidden = true;
  }

  // ------------------------------------------------------------------ entrada

  bindInput() {
    const canvas = this.sm.renderer.domElement;
    let down = null;
    canvas.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 5) return;
      const hit = this.sm.pick(e.clientX, e.clientY, this.world.selectables);
      if (hit) this.selectInstrument(hit.userData.infoId);
    });
    let raf = 0;
    canvas.addEventListener('pointermove', (e) => {
      if (raf || e.buttons) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const hit = this.sm.pick(e.clientX, e.clientY, this.world.selectables);
        canvas.style.cursor = hit ? 'pointer' : '';
        const id = hit?.userData.infoId;
        if (id !== this.hoverId) {
          this.hoverId = id;
          if (id) {
            const box = new THREE.Box3().setFromObject(hit);
            const p = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
            this.anno.add('hover', p, INSTRUMENTS[id].name, { dx: 18, dy: -34, tone: 'blue', small: true });
          } else this.anno.remove('hover');
        }
      });
    });
    this.sm.onUserInteract = () => {
      this.sm.userOverride = true;
    };

    window.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
      else if (e.key === ' ' && tag !== 'button') { e.preventDefault(); this.toggle(); }
      else if (e.key === '+' || e.key === '=') this.sm.dolly(0.75);
      else if (e.key === '-' || e.key === '_') this.sm.dolly(1.33);
      else if (e.key === 'h' || e.key === 'H') this.home();
      else if (e.key === 'c' || e.key === 'C') this.center();
      else if (e.key === 'r' || e.key === 'R') this.controls.setRotating(this.sm.toggleAutoRotate());
    });
  }
}
