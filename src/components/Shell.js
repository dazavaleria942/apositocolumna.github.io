import { h, clear, pad2 } from './dom.js';
import { icon } from './icons.js';
import { STAGES, APP_TEXT } from '../data/stages.js';
import { FINAL_SCREEN } from '../data/procedure.js';

/** Barra superior con marca y menú de etapas 01–06. */
export class TopBar {
  constructor(parent, { onStage }) {
    this.items = STAGES.map((s, i) => h('li', {},
      h('button', { type: 'button', class: 'nav-item', onclick: () => onStage(i) },
        h('span', { class: 'nav-num' }, pad2(s.id)),
        h('span', { class: 'nav-label' }, s.nav))));
    this.pct = h('span', { class: 'top-pct' }, '0%');
    this.fill = h('span', { class: 'top-fill' });
    this.root = h('header', { class: 'topbar' },
      h('div', { class: 'brand' },
        h('span', { class: 'brand-mark', html: icon('spine') }),
        h('div', { class: 'brand-text' },
          h('span', { class: 'brand-title' }, APP_TEXT.shortTitle),
          h('span', { class: 'brand-sub' }, 'Tutorial interactivo 3D'))),
      h('nav', { class: 'stage-nav', 'aria-label': 'Etapas' }, h('ol', {}, this.items)),
      h('div', { class: 'top-progress', 'aria-hidden': 'true' }, h('span', { class: 'top-track' }, this.fill), this.pct),
    );
    parent.prepend(this.root);
  }

  update(stageIdx, completed, progress) {
    this.items.forEach((li, i) => {
      const b = li.firstChild;
      b.classList.toggle('is-current', i === stageIdx);
      b.classList.toggle('is-done', completed.has(i) && i !== stageIdx);
      if (i === stageIdx) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    this.fill.style.transform = `scaleX(${progress})`;
    this.pct.textContent = Math.round(progress * 100) + '%';
  }
}

/** Pantallas superpuestas: carga, inicio, aviso de etapa y pantalla final. */
export class Overlays {
  constructor(viewport) {
    this.viewport = viewport;
    this.loading = h('div', { class: 'overlay loading', role: 'status' },
      h('div', { class: 'loading-card' },
        h('span', { class: 'brand-mark is-large', html: icon('spine') }),
        h('div', { class: 'loading-text' }, 'Preparando simulación'),
        h('div', { class: 'loading-bar' }, h('span', { class: 'loading-fill' })),
        h('div', { class: 'loading-msg' }, '')));
    viewport.append(this.loading);
    this.toastEl = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite', hidden: true });
    viewport.append(this.toastEl);
  }

  setLoading(p, msg) {
    this.loading.querySelector('.loading-fill').style.transform = `scaleX(${p})`;
    this.loading.querySelector('.loading-msg').textContent = msg || '';
  }

  hideLoading() {
    this.loading.classList.add('is-hidden');
    setTimeout(() => this.loading.remove(), 600);
  }

  showIntro(onStart) {
    const btn = h('button', { class: 'btn btn-primary btn-large', type: 'button', onclick: () => { this.hideIntro(); onStart(); } }, 'Comenzar tutorial');
    this.intro = h('div', { class: 'overlay intro' },
      h('div', { class: 'intro-card' },
        h('p', { class: 'intro-kicker' }, 'Simulación educativa'),
        h('h1', { class: 'intro-title' }, APP_TEXT.title),
        h('p', { class: 'intro-sub' }, APP_TEXT.subtitle),
        h('ol', { class: 'intro-stages' }, STAGES.map((s) => h('li', {}, h('span', {}, pad2(s.id)), s.nav))),
        h('div', { class: 'intro-actions' }, btn, h('span', { class: 'intro-hint' }, 'Arrastre para rotar. Rueda o gesto para acercar.')),
        h('p', { class: 'intro-disclaimer' }, APP_TEXT.disclaimer)));
    this.viewport.append(this.intro);
    document.body.classList.add('is-intro');
    requestAnimationFrame(() => this.intro.classList.add('is-in'));
    setTimeout(() => btn.focus({ preventScroll: true }), 300);
  }

  hideIntro() {
    document.body.classList.remove('is-intro');
    if (!this.intro) return;
    this.intro.classList.remove('is-in');
    const el = this.intro;
    this.intro = null;
    setTimeout(() => el.remove(), 500);
  }

  toast(title, sub) {
    clearTimeout(this.toastTimer);
    clear(this.toastEl);
    this.toastEl.append(h('span', { class: 'toast-icon', html: icon('check') }), h('div', {}, h('div', { class: 'toast-title' }, title), h('div', { class: 'toast-sub' }, sub)));
    this.toastEl.hidden = false;
    this.toastEl.classList.remove('is-in');
    requestAnimationFrame(() => this.toastEl.classList.add('is-in'));
    this.toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('is-in');
      setTimeout(() => (this.toastEl.hidden = true), 400);
    }, 2600);
  }

  showFinal({ onRestart, onAssembly, onDressing }) {
    this.hideFinal();
    this.final = h('div', { class: 'overlay final', role: 'dialog', 'aria-label': FINAL_SCREEN.title },
      h('div', { class: 'final-card' },
        h('span', { class: 'final-icon', html: icon('check') }),
        h('h1', { class: 'final-title' }, FINAL_SCREEN.title),
        h('ul', { class: 'final-list' }, FINAL_SCREEN.checklist.map((t, i) => h('li', { style: { animationDelay: 0.25 + i * 0.15 + 's' } }, h('span', { class: 'tick', html: icon('check') }), t))),
        h('div', { class: 'final-actions' },
          h('button', { class: 'btn btn-primary', type: 'button', onclick: onRestart }, 'Reiniciar tutorial'),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: onAssembly }, 'Revisar ensamblaje'),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: onDressing }, 'Revisar colocación del apósito')),
        h('p', { class: 'intro-disclaimer' }, APP_TEXT.disclaimer)));
    this.viewport.append(this.final);
    requestAnimationFrame(() => this.final.classList.add('is-in'));
  }

  hideFinal() {
    if (!this.final) return;
    const el = this.final;
    this.final = null;
    el.classList.remove('is-in');
    setTimeout(() => el.remove(), 400);
  }
}
