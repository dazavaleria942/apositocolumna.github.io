import { h, clear } from './dom.js';
import { icon } from './icons.js';
import { DAYS, INDICATORS, MATERIALS, FOLLOWUP_TEXT } from '../data/followup.js';

const IND_ICON = { teal: 'check', amber: 'warning', red: 'warning' };
const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10"><rect width="16" height="10" fill="#e3e9ef"/></svg>');

/**
 * Vista ampliada de los 8 días: cuadrícula de tarjetas (silicona, algodón o ambas)
 * y vista de detalle por día con transición entre tarjetas.
 */
export class FollowUpGallery {
  constructor({ getThumb, onGoDay, onMaterial }) {
    this.getThumb = getThumb;
    this.onGoDay = onGoDay;
    this.onMaterial = onMaterial;
    this.mode = 'silicona';
    this.detailDay = null;
    this.root = null;
    this.onKey = (e) => this.key(e);
  }

  open({ mode = 'silicona', day = null } = {}) {
    this.mode = mode;
    this.gridScroll = 0;
    this.lastFocus = document.activeElement;
    if (!this.root) this.build();
    document.body.append(this.root);
    document.body.classList.add('modal-open');
    this.renderGrid();
    if (day) this.showDetail(day, 0);
    else this.hideDetail(false);
    requestAnimationFrame(() => {
      this.root.classList.add('is-in');
      (day ? this.detailEl.querySelector('.fu-d-back') : this.closeBtn)?.focus({ preventScroll: true });
    });
    window.addEventListener('keydown', this.onKey, true);
  }

  close() {
    if (!this.root?.isConnected) return;
    this.root.classList.remove('is-in');
    document.body.classList.remove('modal-open');
    window.removeEventListener('keydown', this.onKey, true);
    const el = this.root;
    setTimeout(() => el.remove(), 300);
    this.lastFocus?.focus?.({ preventScroll: true });
  }

  refresh() {
    if (this.root?.isConnected) {
      this.renderGrid();
      if (this.detailDay) this.showDetail(this.detailDay, 0);
    }
  }

  key(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (this.detailDay) this.hideDetail();
      else this.close();
    } else if (this.detailDay && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      this.step(e.key === 'ArrowRight' ? 1 : -1);
    }
  }

  build() {
    this.segBtns = ['silicona', 'algodon', 'comparar'].map((m) => h('button', {
      type: 'button',
      role: 'radio',
      class: 'seg-btn',
      'data-mode': m,
      onclick: () => this.setMode(m),
    }, m === 'comparar' ? 'Comparar ambos' : MATERIALS[m].name));
    this.closeBtn = h('button', { type: 'button', class: 'fu-g-close', 'aria-label': 'Cerrar vista ampliada', html: icon('close'), onclick: () => this.close() });
    this.grid = h('ol', { class: 'fu-grid' });
    this.detailEl = h('section', { class: 'fu-detail', hidden: true, 'aria-live': 'polite' });
    this.root = h('div', { class: 'fu-gallery', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Evolución del apósito: comparación de 8 días' },
      h('div', { class: 'fu-g-panel' },
        h('header', { class: 'fu-g-head' },
          h('div', { class: 'fu-g-titles' },
            h('h2', { class: 'fu-g-title' }, 'Evolución del apósito: 8 días'),
            h('p', { class: 'fu-g-sub' }, FOLLOWUP_TEXT.scenario)),
          h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Material' }, this.segBtns),
          this.closeBtn),
        (this.body = h('div', { class: 'fu-g-body' }, this.grid, this.detailEl))));
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) this.close();
    });
  }

  setMode(m) {
    this.mode = m;
    if (m !== 'comparar') this.onMaterial?.(m);
    this.renderGrid();
    if (this.detailDay) this.showDetail(this.detailDay, 0);
  }

  thumb(mat, day, cls = '') {
    const url = this.getThumb(mat, day);
    return h('img', { class: cls + (url ? ' is-ready' : ''), 'data-thumb': `${mat}-${day}`, src: url || PLACEHOLDER, alt: `Apósito de ${MATERIALS[mat].name.toLowerCase()}, día ${day}` });
  }

  indicator(mat, day) {
    const ind = INDICATORS[DAYS[mat][day - 1].indicator];
    return h('span', { class: `fu-ind tone-${ind.tone}`, html: icon(IND_ICON[ind.tone]) + `<span>${ind.label}</span>` });
  }

  renderGrid() {
    this.segBtns.forEach((b) => {
      const on = b.dataset.mode === this.mode;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(on));
    });
    clear(this.grid);
    this.grid.classList.toggle('is-compare', this.mode === 'comparar');
    for (let day = 1; day <= 8; day++) {
      let inner;
      if (this.mode === 'comparar') {
        inner = [
          h('div', { class: 'fu-card-top' }, h('span', { class: 'fu-day' }, `Día ${day}`)),
          h('div', { class: 'fu-pair' }, ['silicona', 'algodon'].map((m) => h('figure', { class: 'fu-pair-item' },
            this.thumb(m, day),
            h('figcaption', {},
              h('span', { class: 'fu-pair-mat' }, MATERIALS[m].name),
              h('span', { class: 'fu-pair-title' }, DAYS[m][day - 1].title),
              this.indicator(m, day))))),
        ];
      } else {
        const d = DAYS[this.mode][day - 1];
        inner = [
          h('figure', { class: 'fu-thumb' }, this.thumb(this.mode, day)),
          h('div', { class: 'fu-card-body' },
            h('div', { class: 'fu-card-top' }, h('span', { class: 'fu-day' }, `Día ${day}`), this.indicator(this.mode, day)),
            h('h3', { class: 'fu-card-title' }, d.title),
            h('ul', { class: 'fu-changes' }, d.changes.map((c) => h('li', {}, c)))),
        ];
      }
      this.grid.append(h('li', { class: 'fu-card', style: { '--i': day - 1 } },
        h('button', { type: 'button', class: 'fu-card-btn', 'aria-label': `Ver detalle del día ${day}`, onclick: () => this.showDetail(day, 1) }, inner)));
    }
  }

  showDetail(day, dir = 1) {
    this.detailDay = day;
    const mats = this.mode === 'comparar' ? ['silicona', 'algodon'] : [this.mode];
    const content = h('div', { class: 'fu-d-content' + (dir > 0 ? ' from-right' : dir < 0 ? ' from-left' : '') },
      h('div', { class: 'fu-d-head' },
        h('button', { type: 'button', class: 'btn btn-ghost fu-d-back', onclick: () => this.hideDetail(), html: icon('prev') + '<span>Todos los días</span>' }),
        h('div', { class: 'fu-d-nav' },
          h('button', { type: 'button', class: 'fu-d-arrow', 'aria-label': 'Día anterior', disabled: day === 1, onclick: () => this.step(-1), html: icon('prev') }),
          h('span', { class: 'fu-d-day' }, `Día ${day} de 8`),
          h('button', { type: 'button', class: 'fu-d-arrow', 'aria-label': 'Día siguiente', disabled: day === 8, onclick: () => this.step(1), html: icon('next') }))),
      h('div', { class: 'fu-d-cols' + (mats.length > 1 ? ' is-two' : '') }, mats.map((m) => {
        const d = DAYS[m][day - 1];
        const ind = INDICATORS[d.indicator];
        return h('article', { class: 'fu-d-col' },
          h('figure', { class: 'fu-d-figure' }, this.thumb(m, day)),
          h('div', { class: 'fu-d-info' },
            h('p', { class: 'fu-d-mat' }, MATERIALS[m].long),
            h('h3', { class: 'fu-d-title' }, d.title),
            h('div', { class: 'fu-ind-row' }, this.indicator(m, day), h('span', { class: 'fu-ind-detail' }, ind.detail)),
            h('ul', { class: 'fu-changes' }, d.changes.map((c) => h('li', {}, c))),
            h('p', { class: 'fu-surr' }, h('strong', {}, 'Entorno: '), d.surroundings),
            h('p', { class: 'fu-d-text' }, d.text),
            m === 'algodon' && d.indicator === 'change' ? h('p', { class: 'fu-practice', html: icon('info') + `<span>${FOLLOWUP_TEXT.cottonPractice}</span>` }) : null));
      })),
      day === 8 ? h('p', { class: 'fu-eval-inline', html: icon('clipboard') + `<span>${FOLLOWUP_TEXT.evaluation}</span>` }) : null,
      h('div', { class: 'fu-d-foot' },
        h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { this.close(); this.onGoDay(day); } }, `Ver el día ${day} en 3D`)));
    clear(this.detailEl);
    this.detailEl.append(content);
    if (this.grid.hidden === false) this.gridScroll = this.body.scrollTop;
    this.detailEl.hidden = false;
    this.grid.hidden = true;
    this.root.classList.add('is-detail');
    this.body.scrollTop = 0;
    requestAnimationFrame(() => content.classList.add('is-in'));
  }

  step(dir) {
    const d = Math.min(8, Math.max(1, this.detailDay + dir));
    if (d !== this.detailDay) this.showDetail(d, dir);
  }

  hideDetail(focus = true) {
    this.detailDay = null;
    this.detailEl.hidden = true;
    this.grid.hidden = false;
    this.root?.classList.remove('is-detail');
    if (this.body) this.body.scrollTop = this.gridScroll || 0;
    if (focus) this.grid.querySelector('.fu-card-btn')?.focus({ preventScroll: true });
  }
}
