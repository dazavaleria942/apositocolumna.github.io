import { h } from './dom.js';

/**
 * Etiquetas HTML ancladas a puntos 3D, con línea guía. Se actualizan cada cuadro.
 * En pantallas pequeñas las distancias se reducen y la etiqueta se voltea o se
 * desplaza para no salirse del visor ni quedar debajo de los controles.
 */
export class Annotations {
  constructor(parent, sm, { onSelect, reserves } = {}) {
    this.sm = sm;
    this.onSelect = onSelect;
    this.getReserves = reserves || (() => ({ top: 8, right: 8, bottom: 8, left: 8 }));
    this.root = h('div', { class: 'annos', 'aria-live': 'polite' });
    parent.append(this.root);
    this.items = new Map();
    this.frame = 0;
    this.reserves = this.getReserves();
    sm.onUpdate(() => this.update());
    window.addEventListener('resize', () => this.refreshMetrics());
  }

  add(id, anchor, text, { dx = 40, dy = -40, tone = 'neutral', small = false, line = true, target = null, strong = false, minor = false } = {}) {
    this.remove(id, true);
    const label = h(target ? 'button' : 'div', { class: 'anno-label', type: target ? 'button' : null }, text);
    if (target) label.addEventListener('click', () => this.onSelect?.(target));
    const lineEl = line ? h('span', { class: 'anno-line' }) : null;
    const el = h('div', {
      class: `anno tone-${tone}${small ? ' is-small' : ''}${line ? '' : ' no-line'}${strong ? ' is-strong' : ''}${target ? ' is-interactive' : ''}${minor ? ' is-minor' : ''}`,
    }, h('span', { class: 'anno-dot' }), lineEl, label);
    this.root.append(el);
    this.reserves = this.getReserves();
    const item = { el, anchor, label, lineEl, dx, dy, line, w: 0, h: 0, last: '' };
    this.items.set(id, item);
    this.measure(item);
    requestAnimationFrame(() => el.classList.add('is-in'));
    this.updateOne(item);
  }

  measure(item) {
    item.w = item.label.offsetWidth;
    item.h = item.label.offsetHeight;
  }

  refreshMetrics() {
    this.reserves = this.getReserves();
    this.items.forEach((it) => this.measure(it));
  }

  setTone(id, tone) {
    const it = this.items.get(id);
    if (!it) return;
    it.el.className = it.el.className.replace(/tone-\w+/, 'tone-' + tone);
  }

  remove(id, immediate = false) {
    const it = this.items.get(id);
    if (!it) return;
    this.items.delete(id);
    if (immediate) it.el.remove();
    else {
      it.el.classList.remove('is-in');
      setTimeout(() => it.el.remove(), 250);
    }
  }

  clear() {
    for (const id of [...this.items.keys()]) this.remove(id, true);
  }

  updateOne(it) {
    const p = typeof it.anchor === 'function' ? it.anchor() : it.anchor;
    if (!p) return;
    const s = this.sm.project(p);
    const W = this.sm.width;
    const H = this.sm.height;
    if (!s.visible || s.x < -20 || s.y < -20 || s.x > W + 20 || s.y > H + 20) {
      it.el.style.visibility = 'hidden';
      return;
    }
    it.el.style.visibility = '';
    const k = W < 520 ? 0.6 : W < 800 ? 0.8 : 1;
    const dx = it.dx * k;
    const dy = it.dy * k;
    const R = this.reserves;
    const m = 6;
    const minX = R.left + m;
    const maxX = W - R.right - m;
    const minY = R.top + m + it.h / 2;
    const maxY = H - R.bottom - m - it.h / 2;
    if (it.line) {
      // Lado preferido; si no cabe se voltea, y si no cabe en ningún lado se
      // centra encima o debajo del punto, siempre dentro del área útil.
      const ax = Math.abs(dx);
      const fitsLeft = s.x - ax - it.w >= minX;
      const fitsRight = s.x + ax + it.w <= maxX;
      let mode = dx < 0 ? 'left' : 'right';
      if (mode === 'left' && !fitsLeft) mode = fitsRight ? 'right' : 'center';
      else if (mode === 'right' && !fitsRight) mode = fitsLeft ? 'left' : 'center';
      let lx;
      let ly;
      let tf;
      let ex;
      let ey;
      if (mode === 'center') {
        const cx = Math.min(Math.max(s.x, minX + it.w / 2), maxX - it.w / 2);
        const gap = Math.max(Math.abs(dy), it.h / 2 + 16);
        let cy = s.y + (dy > 0 ? gap : -gap);
        if (cy < minY || cy > maxY) cy = s.y + (dy > 0 ? -gap : gap);
        cy = Math.min(Math.max(cy, minY), maxY);
        lx = cx - s.x;
        ly = cy - s.y;
        tf = 'translate(-50%, -50%)';
        ex = lx;
        ey = ly + (ly < 0 ? it.h / 2 : -it.h / 2);
      } else {
        const left = mode === 'left';
        lx = left ? -ax : ax;
        ly = Math.min(Math.max(s.y + dy, minY), maxY) - s.y;
        tf = left ? 'translate(-100%, -50%)' : 'translate(0, -50%)';
        ex = lx;
        ey = ly;
      }
      const key = `${Math.round(lx)}|${Math.round(ly)}|${mode}`;
      if (key !== it.last) {
        it.last = key;
        it.label.style.left = lx.toFixed(1) + 'px';
        it.label.style.top = ly.toFixed(1) + 'px';
        it.label.style.transform = tf;
        it.el.classList.toggle('is-left', mode === 'left');
        it.el.classList.toggle('is-center', mode === 'center');
        const len = Math.hypot(ex, ey);
        const ang = (Math.atan2(ey, ex) * 180) / Math.PI;
        it.lineEl.style.width = len.toFixed(1) + 'px';
        it.lineEl.style.transform = `rotate(${ang.toFixed(1)}deg)`;
      }
    } else {
      const left = dx < 0;
      const key = `${Math.round(dx)}|${left}`;
      if (key !== it.last) {
        it.last = key;
        it.label.style.left = dx.toFixed(1) + 'px';
        it.label.style.top = '0px';
        it.label.style.transform = left ? 'translate(-100%, -50%)' : 'translate(0, -50%)';
      }
    }
    it.el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
  }

  update() {
    if (++this.frame % 30 === 0) this.reserves = this.getReserves();
    this.items.forEach((it) => this.updateOne(it));
  }
}
