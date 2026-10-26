import { THREE, view, drive, pulse } from './helpers.js';
import { DAYS, INDICATORS, MATERIALS, conditionFor, lerpCondition } from '../data/followup.js';

// Etapa 6 — Posquirúrgico. Cada día anima la transición del apósito desde el
// estado del día anterior y señala los cambios visibles.

/** Vista cercana del apósito y de la piel circundante. */
export function dressingView(world, dist = 0.42, az = 0.26, el = 1.08) {
  return view(world.dressingPoint(0, -0.05, 0), dist, az, el);
}

function exudateName(c) {
  if (c.pus > 0.3) return 'Exudado purulento (signo de alarma)';
  return c.hue < 0.35 ? 'Exudado serohemático' : 'Exudado seroso';
}

export function followupDay(ctx, tl) {
  const { world, sm, anno, hud, step, follow, ui } = ctx;
  const day = step.day;
  const mat = follow.material;
  const data = DAYS[mat][day - 1];
  const ind = INDICATORS[data.indicator];
  const from = conditionFor(mat, Math.max(1, day - 1), follow.signs);
  // follow.target se lee en cada cuadro: si se marcan signos de alarma durante la
  // animación, el modelo los refleja sin reiniciar el paso.
  follow.target = conditionFor(mat, day, follow.signs);

  tl.call(() => {
    hud.badge(`Día ${day} de 8`);
    world.setFollowUp(mat, from);
  }, null, 0);
  tl.add(sm.cameraTo(dressingView(world), 1.3), 0);

  let lastK = -1;
  drive(tl, day === 1 ? 0.8 : 2.2, (t) => {
    const k = Math.round(t * 40) / 40; // limita los redibujos de textura
    if (k === lastK && t < 1) return;
    lastK = k;
    world.setFollowUp(mat, lerpCondition(from, follow.target, k));
  }, { at: 0.7, ease: 'power1.inOut' });

  if (day === 1) {
    const sc = world.fx.scan;
    const p0 = world.dressingPoint(-0.55, 0, 0.004);
    const p1 = world.dressingPoint(0.55, 0, 0.004);
    tl.call(() => {
      sc.visible = true;
      sc.scale.set(1, 0.5, 0.85);
      sc.position.copy(p0);
    }, null, 0.9);
    drive(tl, 1.6, (t) => sc.position.lerpVectors(p0, p1, t), { at: 0.9, ease: 'sine.inOut' });
    tl.call(() => {
      sc.visible = false;
      sc.scale.set(1, 1, 1);
    }, null, 2.6);
  }

  // Señalar los cambios visibles al final de la transición
  tl.call(() => {
    const c = follow.target;
    // El mensaje se muestra antes que las etiquetas para que estas lo eviten
    hud.note(`${MATERIALS[mat].name}: ${ind.label}`, ind.tone);
    anno.clear();
    if (c.stain > 0.05) anno.add('fu-exu', world.dressingPoint(0.03, 0.02, 0.006), exudateName(c), { dx: -70, dy: -54, tone: c.pus > 0.3 ? 'red' : 'neutral' });
    else anno.add('fu-ok', world.dressingPoint(0.05, 0, 0.006), mat === 'algodon' ? 'Gasa limpia y seca' : 'Apósito íntegro y seco', { dx: -60, dy: -54, tone: 'teal' });
    const liftK = c.lift.reduce((m, v, i) => (v > c.lift[m] ? i : m), 0);
    if (c.lift[liftK] > 0.3) {
      const corner = [[0.47, 0.44], [-0.47, 0.44], [0.47, -0.44], [-0.47, -0.44]][liftK];
      anno.add('fu-lift', world.dressingPoint(corner[0], corner[1], 0.008), mat === 'algodon' ? 'Esparadrapo despegado' : 'Borde despegado', { dx: 60, dy: 40, tone: 'neutral' });
    }
    if (c.macer > 0.2) anno.add('fu-mac', world.dressingPoint(-0.3, 0.62, 0.001), 'Piel macerada', { dx: -50, dy: 50, tone: 'neutral', small: true, minor: true });
    if (c.fray > 0.3) anno.add('fu-fray', world.dressingPoint(-0.5, -0.2, 0.004), 'Fibras sueltas', { dx: -60, dy: -30, tone: 'neutral', small: true, minor: true });
    if (c.redness > 0.3) anno.add('fu-red', world.dressingPoint(0.35, -0.85, 0.001), 'Enrojecimiento (alarma)', { dx: 50, dy: -50, tone: 'red' });
  }, null, day === 1 ? 2.7 : 3.0);
  pulse(tl, world, world.dressingPoint(0, 0, 0.006), null, { at: day === 1 ? 2.7 : 3.0, scale: 3.2 });

  if (follow.signs.length) tl.call(() => ui.showAlarm?.(), null, 1.0);
  tl.to({}, { duration: 1.4 }, day === 1 ? 2.8 : 3.1);
  if (day === 8) tl.call(() => ui.showEvaluation?.());
}

export const FOLLOWUP_ANIMATIONS = {
  'followup-day': followupDay,
};

export { THREE };
