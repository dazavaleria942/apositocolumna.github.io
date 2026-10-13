import { THREE, view, drive } from './helpers.js';
import { INSTRUMENTS } from '../data/instruments.js';

// Etapa 1 — Materiales: la cámara recorre la mesa de instrumental por categoría.

export function frameDisplay(world, ids, { dist = null, az = 0.0, el = 1.0 } = {}) {
  const box = world.displayBounds(ids);
  const c = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const d = dist ?? Math.max(0.42, Math.max(size.x * 1.5, size.z * 1.7) + 0.16);
  return view(c, d, az, el);
}

export function materialsCategory(ctx, tl) {
  const { world, sm, anno, step } = ctx;
  const ids = step.main.filter((id) => world.display[id]);
  tl.add(sm.cameraTo(frameDisplay(world, ids, { az: step.implants ? 0.25 : 0.0, el: step.implants ? 0.95 : 1.0 }), 1.4), 0);
  tl.call(() => world.highlightDisplay(ids), null, 0.6);
  ids.forEach((id, i) => {
    const obj = world.display[id];
    const at = 1.2 + i * 0.45;
    const base = obj.position.clone();
    tl.call(() => {
      const box = new THREE.Box3().setFromObject(obj);
      const top = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, box.min.z + (box.max.z - box.min.z) * 0.35);
      anno.add('it-' + id, top, INSTRUMENTS[id]?.name || id, { dx: i % 2 ? 24 : -24, dy: -36 - (i % 3) * 26, tone: 'neutral', small: true, target: id });
    }, null, at);
    drive(tl, 0.7, (t) => obj.position.set(base.x, base.y + Math.sin(t * Math.PI) * 0.012, base.z), { ease: 'sine.inOut', at });
  });
  tl.to({}, { duration: 1.0 }, 1.2 + ids.length * 0.45 + 0.6);
}

/** Enfoque de un instrumento seleccionado (fuera de la línea de tiempo). */
export function focusInstrument(world, sm, id) {
  const v = frameDisplay(world, [id], { dist: 0.34, az: 0.0, el: 0.95 });
  sm.flyTo(v, 1.0);
}

export const MATERIAL_ANIMATIONS = {
  'materials-category': materialsCategory,
};
