import { h, clear } from './dom.js';
import { icon } from './icons.js';

/**
 * Elementos superpuestos al visor 3D: insignia de vista, medidor de torque,
 * listas de comprobación, secuencias, notas, confirmaciones y registro digital.
 */
export class Hud {
  constructor(parent) {
    this.root = h('div', { class: 'hud' });
    this.badgeEl = h('div', { class: 'hud-badge', hidden: true });
    this.topCenter = h('div', { class: 'hud-top-center' });
    this.topRight = h('div', { class: 'hud-top-right' });
    this.center = h('div', { class: 'hud-center' });
    this.noteEl = h('div', { class: 'hud-note', hidden: true, role: 'status' });
    this.root.append(this.badgeEl, this.topCenter, this.topRight, this.center, this.noteEl);
    parent.append(this.root);
    this.torque = this.makeTorque();
  }

  clear() {
    this.badge(null);
    clear(this.topCenter);
    clear(this.topRight);
    clear(this.center);
    this.center.classList.remove('is-banner');
    this.noteHide();
    this.torque.reset();
    this.root.classList.remove('is-dim');
  }

  badge(text) {
    this.badgeEl.hidden = !text;
    this.badgeEl.innerHTML = text ? `<span class="pulse-dot"></span>${text}` : '';
  }

  note(text, tone = 'blue') {
    this.noteEl.hidden = false;
    this.noteEl.className = 'hud-note tone-' + tone;
    this.noteEl.innerHTML = (tone === 'teal' ? icon('check') : icon('info')) + `<span>${text}</span>`;
  }

  noteHide() {
    this.noteEl.hidden = true;
  }

  // ------------------------------------------------------------ medidor de torque

  makeTorque() {
    const segs = Array.from({ length: 10 }, () => h('span', { class: 'seg' }));
    const counter = h('span', { class: 'torque-counter' });
    const el = h('div', { class: 'card torque', role: 'status' },
      h('div', { class: 'torque-head' }, h('span', { class: 'torque-title' }, 'TORQUE'), counter),
      h('div', { class: 'torque-bar', 'aria-hidden': 'true' }, segs),
      h('div', { class: 'torque-caption' }, 'Valor establecido por el fabricante.'),
    );
    const api = {
      el,
      show: () => {
        if (!el.isConnected) this.topCenter.append(el);
        el.classList.remove('is-complete');
        api.set(0);
      },
      set: (p) => {
        const n = Math.round(p * 10);
        segs.forEach((s, i) => s.classList.toggle('on', i < n));
        if (p < 1) el.classList.remove('is-complete');
      },
      complete: () => {
        segs.forEach((s) => s.classList.add('on'));
        el.classList.add('is-complete');
      },
      counter: (i, n) => {
        counter.textContent = `Caps ${i}/${n}`;
      },
      reset: () => {
        el.remove();
        counter.textContent = '';
        el.classList.remove('is-complete');
      },
    };
    return api;
  }

  // ------------------------------------------------------------ lista de comprobación

  checklist(title, items, { pending = false } = {}) {
    clear(this.topRight);
    this.checkItems = items.map((t) => h('li', { class: pending ? 'is-pending' : '' }, h('span', { class: 'tick', html: icon('check') }), h('span', {}, t)));
    const card = h('div', { class: 'card checklist is-entering' }, h('div', { class: 'card-title' }, title), h('ul', {}, this.checkItems));
    this.topRight.append(card);
    requestAnimationFrame(() => card.classList.remove('is-entering'));
  }

  tick(i) {
    const li = this.checkItems?.[i];
    if (li) {
      li.classList.add('is-done');
      li.classList.remove('is-pending');
    }
  }

  // ------------------------------------------------------------ confirmación

  banner(title, sub = '') {
    clear(this.center);
    this.center.classList.add('is-banner');
    const b = h('div', { class: 'banner is-entering', role: 'status' },
      h('span', { class: 'banner-icon', html: icon('check') }),
      h('div', {}, h('div', { class: 'banner-title' }, title), sub ? h('div', { class: 'banner-sub' }, sub) : null));
    this.center.append(b);
    requestAnimationFrame(() => b.classList.remove('is-entering'));
  }

  // ------------------------------------------------------------ secuencia de iconos

  sequence(items) {
    clear(this.topCenter);
    this.seqEls = items.map((it) => h('div', { class: 'seq-item' },
      h('span', { class: 'seq-icon', html: icon(it.icon) }),
      h('span', { class: 'seq-label' }, it.label),
      h('span', { class: 'seq-check', html: icon('check') })));
    const card = h('div', { class: 'card sequence is-entering' }, this.seqEls);
    this.topCenter.append(card);
    requestAnimationFrame(() => card.classList.remove('is-entering'));
  }

  sequenceActivate(i) {
    this.seqEls?.forEach((e, k) => e.classList.toggle('is-active', k === i));
  }

  sequenceDone(i) {
    const e = this.seqEls?.[i];
    if (e) {
      e.classList.remove('is-active');
      e.classList.add('is-done');
    }
  }

  // ------------------------------------------------------------ registro digital (5.9)

  record(data) {
    clear(this.center);
    this.center.classList.remove('is-banner');
    this.root.classList.add('is-dim');
    this.recordRows = data.fields.map(([label, value]) => {
      const v = h('span', { class: 'rec-value', 'data-value': value });
      return { row: h('div', { class: 'rec-row' }, h('span', { class: 'rec-label' }, label), v), v, value };
    });
    this.recordStamp = h('div', { class: 'rec-stamp', html: icon('check') + '<span>REGISTRO COMPLETADO</span>' });
    const card = h('div', { class: 'card record is-entering', role: 'dialog', 'aria-label': data.title },
      h('div', { class: 'rec-head' }, h('span', { class: 'rec-icon', html: icon('form') }), h('div', { class: 'rec-title' }, data.title)),
      h('div', { class: 'rec-body' }, this.recordRows.map((r) => r.row)),
      this.recordStamp);
    this.center.append(card);
    requestAnimationFrame(() => card.classList.remove('is-entering'));
  }

  recordType(i) {
    const r = this.recordRows?.[i];
    if (!r) return;
    r.row.classList.add('is-active');
    const full = r.value;
    let k = 0;
    clearInterval(r.timer);
    r.timer = setInterval(() => {
      k += 1;
      r.v.textContent = full.slice(0, k);
      if (k >= full.length) {
        clearInterval(r.timer);
        r.row.classList.remove('is-active');
        r.row.classList.add('is-done');
      }
    }, 22);
  }

  recordComplete() {
    this.recordRows?.forEach((r) => {
      clearInterval(r.timer);
      r.v.textContent = r.value;
      r.row.classList.add('is-done');
    });
    this.recordStamp?.classList.add('is-shown');
  }
}
