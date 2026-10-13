import { h, clear } from './dom.js';
import { icon } from './icons.js';

/** Controles de cámara: acercar, alejar, rotar, vista inicial y centrar zona quirúrgica. */
export class ViewControls {
  constructor(parent, handlers) {
    const btn = (name, label, key, fn, extra = {}) =>
      h('button', { class: 'vc-btn', type: 'button', 'aria-label': label, 'data-tip': label + (key ? ` (${key})` : ''), onclick: fn, ...extra, html: icon(name) });
    this.rotateBtn = btn('rotate', 'Rotar', 'R', () => handlers.rotate(), { 'aria-pressed': 'false' });
    this.root = h('div', { class: 'view-controls', role: 'toolbar', 'aria-label': 'Controles de cámara' },
      btn('plus', 'Acercar', '+', handlers.zoomIn),
      btn('minus', 'Alejar', '−', handlers.zoomOut),
      this.rotateBtn,
      btn('home', 'Vista inicial', 'H', handlers.home),
      btn('target', 'Centrar zona quirúrgica', 'C', handlers.center),
    );
    parent.append(this.root);
  }

  setRotating(on) {
    this.rotateBtn.setAttribute('aria-pressed', String(on));
    this.rotateBtn.classList.toggle('is-on', on);
  }
}

/** Barra de pasos y reproducción (▶ ⏸ ↻ ← →) dentro del visor. */
export class StepDock {
  constructor(parent, handlers) {
    this.handlers = handlers;
    this.playBtn = h('button', { class: 'dock-btn is-primary', type: 'button', 'aria-label': 'Pausar', onclick: () => handlers.toggle(), html: icon('pause') });
    this.chips = h('ol', { class: 'dock-steps', 'aria-label': 'Pasos de la etapa' });
    this.bar = h('span', { class: 'dock-progress-fill' });
    this.title = h('div', { class: 'dock-title' });
    this.root = h('div', { class: 'dock' },
      h('div', { class: 'dock-row' },
        h('div', { class: 'dock-buttons' },
          h('button', { class: 'dock-btn', type: 'button', 'aria-label': 'Paso anterior', 'data-tip': 'Anterior', onclick: () => handlers.prev(), html: icon('prev') }),
          this.playBtn,
          h('button', { class: 'dock-btn', type: 'button', 'aria-label': 'Repetir', 'data-tip': 'Repetir', onclick: () => handlers.repeat(), html: icon('repeat') }),
          h('button', { class: 'dock-btn', type: 'button', 'aria-label': 'Paso siguiente', 'data-tip': 'Siguiente', onclick: () => handlers.next(), html: icon('next') }),
        ),
        this.chips,
      ),
      h('div', { class: 'dock-progress', 'aria-hidden': 'true' }, this.bar),
    );
    parent.append(this.root);
  }

  render(steps, current, doneUpTo) {
    clear(this.chips);
    steps.forEach((s, i) => {
      if (i > 0) this.chips.append(h('li', { class: 'dock-sep', 'aria-hidden': 'true' }));
      const state = i === current ? 'is-current' : i < doneUpTo ? 'is-done' : '';
      this.chips.append(h('li', {},
        h('button', {
          class: 'dock-chip ' + state,
          type: 'button',
          'aria-current': i === current ? 'step' : null,
          'aria-label': `${s.id} ${s.title}`,
          'data-tip': s.title,
          onclick: () => this.handlers.goStep(i),
        }, s.id)));
    });
    // Mantener visible el paso actual cuando la barra se desplaza (pantallas angostas)
    requestAnimationFrame(() => {
      const cur = this.chips.querySelector('.is-current');
      if (!cur || this.chips.scrollWidth <= this.chips.clientWidth) return;
      const target = cur.parentElement.offsetLeft - (this.chips.clientWidth - cur.offsetWidth) / 2;
      this.chips.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    });
  }

  setPlaying(playing) {
    this.playBtn.innerHTML = icon(playing ? 'pause' : 'play');
    this.playBtn.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
    this.playBtn.dataset.tip = playing ? 'Pausar' : 'Reproducir';
  }

  setProgress(p) {
    this.bar.style.transform = `scaleX(${Math.max(0, Math.min(1, p))})`;
  }
}
