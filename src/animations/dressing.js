import { THREE, view, drive, show, pulse, VIEWS } from './helpers.js';
import { INCISION, AUX_TABLE } from '../scenes/layout.js';
import { skinY, WET_COLOR } from '../models/Patient.js';
import { DRESSING } from '../models/Dressing.js';
import { lerp } from '../utils/math.js';

// Etapas 3, 5 y 6 — limpieza, apósito, verificación y registro.

const CX = (INCISION.x0 + INCISION.x1) / 2;
const skinPt = (x, z, lift = 0) => new THREE.Vector3(x, skinY(x, z) + lift, z);

/** Orientación de la pinza: inclinada hacia el observador y hacia craneal. */
const FORCEPS_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.55, 0, 0.42));

function placeForceps(tool, x, z, lift) {
  tool.position.copy(skinPt(x, z, lift));
  tool.quaternion.copy(FORCEPS_Q);
}

/**
 * Pasada de limpieza con la gasa: aproximación, deslizamiento (pintando humedad) y retirada.
 * passes: [{ x0, x1, z }]
 */
function cleaningPasses(tl, world, tool, passes, { speed = 1, wet = true } = {}) {
  const P = world.patient;
  passes.forEach((p, i) => {
    tl.call(() => {
      tool.visible = true;
      placeForceps(tool, p.x0, p.z, 0.05);
    });
    drive(tl, 0.45 / speed, (t) => placeForceps(tool, p.x0, p.z, lerp(0.05, 0.0005, t)), { ease: 'power2.out' });
    let last = p.x0;
    drive(tl, 1.0 / speed, (t) => {
      const x = lerp(p.x0, p.x1, t);
      placeForceps(tool, x, p.z, 0.0005);
      if (wet) {
        const steps = Math.max(1, Math.ceil(Math.abs(x - last) / 0.002));
        for (let k = 1; k <= steps; k++) {
          const xx = lerp(last, x, k / steps);
          P.wet.dab(xx, p.z, 0.0085, WET_COLOR, 1);
        }
      }
      last = x;
    }, { ease: 'power1.inOut' });
    drive(tl, 0.35 / speed, (t) => placeForceps(tool, p.x1, p.z, lerp(0.0005, 0.05, t)), { ease: 'power2.in' });
    if (i < passes.length - 1) tl.call(() => tool.userData.gauze && pulseGauze(tool));
  });
  tl.call(() => (tool.visible = false));
}

function pulseGauze(tool) {
  // gasa nueva en cada pasada: breve cambio de tono
  const g = tool.userData.gauze;
  g.traverse((o) => {
    if (o.isMesh && o.material.emissive) {
      o.material.emissive.set('#9fd3ff');
      o.material.emissiveIntensity = 0.25;
      setTimeout(() => (o.material.emissiveIntensity = 0), 220);
    }
  });
}

function dryDabs(tl, world, tool, points, { speed = 1 } = {}) {
  const P = world.patient;
  tl.call(() => {
    tool.visible = true;
    placeForceps(tool, points[0][0], points[0][1], 0.05);
  });
  points.forEach(([x, z], i) => {
    const prev = i === 0 ? points[0] : points[i - 1];
    drive(tl, 0.35 / speed, (t) => placeForceps(tool, lerp(prev[0], x, t), lerp(prev[1], z, t), 0.012 + Math.sin(t * Math.PI) * 0.01), { ease: 'sine.inOut' });
    drive(tl, 0.22 / speed, (t) => placeForceps(tool, x, z, lerp(0.012, 0.0006, t)), { ease: 'power2.out' });
    tl.call(() => {
      for (let k = 0; k < 3; k++) P.wet.dab(x + (k - 1) * 0.008, z, 0.014, 'rgba(0,0,0,ALPHA)', 1, true);
    });
    drive(tl, 0.2 / speed, (t) => placeForceps(tool, x, z, lerp(0.0006, 0.012, t)), { ease: 'power2.in' });
  });
  drive(tl, 0.35, (t) => placeForceps(tool, points[points.length - 1][0], points[points.length - 1][1], lerp(0.012, 0.06, t)));
  tl.call(() => {
    P.wet.clear();
    tool.visible = false;
  });
}

const PASSES_FULL = [
  { x0: INCISION.x0 - 0.008, x1: INCISION.x1 + 0.008, z: 0 },
  { x0: INCISION.x0 - 0.008, x1: INCISION.x1 + 0.008, z: 0.017 },
  { x0: INCISION.x0 - 0.008, x1: INCISION.x1 + 0.008, z: 0.034 },
  { x0: INCISION.x0 - 0.008, x1: INCISION.x1 + 0.008, z: -0.017 },
  { x0: INCISION.x0 - 0.008, x1: INCISION.x1 + 0.008, z: -0.034 },
];

const DAB_POINTS = [
  [CX - 0.06, 0.03], [CX - 0.02, 0.035], [CX + 0.02, 0.035], [CX + 0.06, 0.03],
  [CX + 0.06, -0.03], [CX + 0.02, -0.035], [CX - 0.02, -0.035], [CX - 0.06, -0.03],
];

function showArrows(tl, world, anno, at) {
  tl.call(() => {
    world.fx.arrows.forEach((a) => {
      const side = a.userData.side;
      const z0 = side * 0.009;
      a.position.copy(skinPt(CX + 0.035, z0, 0.0018));
      a.rotation.set(0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
      a.visible = true;
    });
    anno.add('flow', skinPt(CX + 0.035, 0.045, 0.003), 'ZONA MÁS LIMPIA → ZONA MENOS LIMPIA', { dx: -60, dy: 64, tone: 'teal', strong: true });
  }, null, at);
}

function sequenceHud(tl, hud, items, at = 0.6, gap = 1.25) {
  tl.call(() => hud.sequence(items), null, at);
  items.forEach((_, i) => {
    tl.call(() => hud.sequenceActivate(i), null, at + 0.2 + i * gap);
    tl.call(() => hud.sequenceDone(i), null, at + 0.2 + i * gap + gap * 0.75);
  });
  tl.to({}, { duration: 0.6 }, at + items.length * gap + 0.4);
}

// ---------------------------------------------------------------- Etapa 2

export function handHygiene(ctx, tl) {
  const { sm, hud } = ctx;
  tl.add(sm.cameraTo(VIEWS.overview(), 1.4), 0);
  sequenceHud(tl, hud, [{ icon: 'hands', label: 'Higiene quirúrgica de manos' }], 0.8, 2.2);
}

export function ppe(ctx, tl) {
  const { sm, hud } = ctx;
  tl.add(sm.cameraTo(VIEWS.overview(), 1.2), 0);
  sequenceHud(tl, hud, [
    { icon: 'gloves', label: 'Guantes' },
    { icon: 'gown', label: 'Bata' },
    { icon: 'mask', label: 'Mascarilla' },
    { icon: 'goggles', label: 'Gorro y protección ocular' },
  ], 0.6, 0.9);
}

export function sterileFieldPrep(ctx, tl) {
  const { world, sm, anno } = ctx;
  const f = world.aux.field;
  tl.add(sm.cameraTo(VIEWS.auxTable(), 1.4), 0);
  tl.call(() => {
    f.visible = true;
    f.scale.set(0.22, 1, 0.3);
  }, null, 1.0);
  drive(tl, 1.3, (t) => f.scale.set(lerp(0.22, 1, t), 1, lerp(0.3, 1, Math.min(1, t * 1.4))), { ease: 'power2.inOut' });
  tl.call(() => anno.add('campo', f.position.clone().add(new THREE.Vector3(0, 0.005, 0)), 'Campo estéril', { dx: -40, dy: -60, tone: 'teal' }));
  tl.to({}, { duration: 1.2 });
}

export function antisepsis(ctx, tl) {
  const { world, sm, anno } = ctx;
  const P = world.patient;
  tl.add(sm.cameraTo(VIEWS.field(), 1.4), 0);
  tl.call(() => {
    P.antiseptic.clear();
    anno.add('anti', skinPt(CX - 0.06, 0.04), 'Solución antiséptica indicada', { dx: -60, dy: -60, tone: 'neutral' });
  }, null, 1.0);
  drive(tl, 2.6, (t) => P.paintAntisepticDisc(t), { ease: 'power1.inOut', at: 1.2 });
  tl.call(() => anno.add('ok', skinPt(CX + 0.05, -0.04), 'Zona preparada', { dx: 60, dy: 40, tone: 'teal' }));
  tl.to({}, { duration: 1.0 });
}

// ---------------------------------------------------------------- Etapa 3 (recordatorio rápido)

function revealAuxItems(tl, world, anno, labels, { start = 1.2, gap = 0.45 } = {}) {
  const parts = world.aux.parts;
  const order = [
    ['gauze', parts.gauze, 'Gasas', -60, -40],
    ['solution', parts.solution, 'Solución indicada', 50, -60],
    ['forceps', parts.forceps, 'Pinza', 40, -64],
    ['pack', parts.pack, 'Apósito', -56, -54],
    ['gloves', parts.gloves, 'Elementos de protección', 50, 54],
  ].filter(([k]) => labels.includes(k));
  tl.call(() => {
    world.aux.items.visible = true;
    world.aux.items.children.forEach((c) => (c.visible = false));
  }, null, 0);
  order.forEach(([key, obj, label, ldx, ldy], i) => {
    const objs = Array.isArray(obj) ? obj : [obj];
    const t0 = start + i * gap;
    tl.call(() => {
      objs.forEach((o) => {
        o.visible = true;
        o.position.copy(o.userData.home).add(new THREE.Vector3(0, 0.06, 0));
      });
      if (key === 'gauze') parts.single.visible = true;
      if (key === 'solution') parts.basin.visible = true;
    }, null, t0);
    drive(tl, 0.5, (t) => objs.forEach((o) => o.position.copy(o.userData.home).add(new THREE.Vector3(0, 0.06 * (1 - t), 0))), { ease: 'power2.out', at: t0 });
    tl.call(() => anno.add('it-' + key, objs[0].userData.home.clone().add(new THREE.Vector3(0, 0.02, 0)), label, { dx: ldx, dy: ldy, tone: 'neutral', small: true }), null, t0 + 0.3);
  });
  return start + order.length * gap + 0.5;
}

export function cleanPrepare(ctx, tl) {
  const { world, sm, anno } = ctx;
  tl.add(sm.cameraTo(VIEWS.auxTable(), 1.3), 0);
  const end = revealAuxItems(tl, world, anno, ['gauze', 'solution', 'forceps'], { start: 1.0, gap: 0.55 });
  tl.to({}, { duration: 0.8 }, end);
}

export function cleanObserve(ctx, tl) {
  const { world, sm, anno } = ctx;
  tl.add(sm.cameraTo(VIEWS.incision(), 1.4), 0);
  [0.2, 0.5, 0.8].forEach((k, i) => {
    const x = lerp(INCISION.x0, INCISION.x1, k);
    pulse(tl, world, skinPt(x, 0, 0.002), null, { at: 1.3 + i * 0.35, scale: 1.4 });
  });
  tl.call(() => anno.add('inc', skinPt(CX, 0.004, 0.002), 'Incisión', { dx: 60, dy: -60, tone: 'neutral' }), null, 1.4);
  tl.to({}, { duration: 1.4 });
}

export function cleanSolution(ctx, tl) {
  const { world, sm, anno } = ctx;
  tl.add(sm.cameraTo(VIEWS.incision(), 1.2), 0);
  tl.call(() => anno.add('tool', () => world.tools.forcepsWet.position.clone().add(new THREE.Vector3(0, 0.06, 0.05)), 'Gasa con solución indicada', { dx: 60, dy: -30, tone: 'neutral' }), null, 0.9);
  tl.to({}, { duration: 0.1 }, 1.0);
  cleaningPasses(tl, world, world.tools.forcepsWet, PASSES_FULL.slice(0, 1));
  tl.call(() => anno.remove('tool'));
  tl.to({}, { duration: 0.8 });
}

export function cleanDirection(ctx, tl) {
  const { world, sm, anno } = ctx;
  tl.add(sm.cameraTo(view(skinPt(CX, 0), 0.4, 0.2, 1.05), 1.2), 0);
  showArrows(tl, world, anno, 1.0);
  tl.to({}, { duration: 0.1 }, 1.4);
  cleaningPasses(tl, world, world.tools.forcepsWet, [PASSES_FULL[1], PASSES_FULL[3]], { speed: 1.2 });
  tl.to({}, { duration: 0.8 });
}

export function cleanDry(ctx, tl) {
  const { world, sm, anno } = ctx;
  tl.add(sm.cameraTo(VIEWS.incision(), 1.2), 0);
  tl.call(() => {
    world.patient.wetStrips();
    anno.add('tool', () => world.tools.forcepsDry.position.clone().add(new THREE.Vector3(0, 0.06, 0.05)), 'Gasa estéril seca', { dx: 60, dy: -30, tone: 'neutral' });
  }, null, 0.6);
  tl.to({}, { duration: 0.1 }, 1.0);
  dryDabs(tl, world, world.tools.forcepsDry, DAB_POINTS.slice(0, 5), { speed: 1.3 });
  tl.call(() => anno.remove('tool'));
  tl.to({}, { duration: 0.6 });
}

// ---------------------------------------------------------------- Etapa 5

export function dressingHygiene(ctx, tl) {
  const { sm, hud, world } = ctx;
  tl.add(sm.cameraTo(VIEWS.overview(), 1.4), 0);
  drive(tl, 1.2, (t) => world.setXray(1 - t), { at: 0.2 });
  sequenceHud(tl, hud, [
    { icon: 'hands', label: 'Higiene de manos' },
    { icon: 'gloves', label: 'Guantes' },
    { icon: 'check', label: 'Preparación' },
  ], 0.8, 1.1);
  tl.add(sm.cameraTo(VIEWS.field(), 1.6), 3.4);
}

export function woundReview(ctx, tl) {
  const { world, sm, anno, hud, step } = ctx;
  tl.add(sm.cameraTo(VIEWS.incision(), 1.5), 0);
  const spots = [
    [CX - 0.045, 0.016, 'Sangrado', -70, -50],
    [CX + 0.02, 0.018, 'Secreción', 40, -60],
    [CX + 0.05, -0.016, 'Enrojecimiento', 60, 40],
    [CX - 0.02, -0.017, 'Apertura de bordes', -90, 50],
  ];
  tl.call(() => hud.checklist('Revisión de la herida', step.checklist, { pending: true }), null, 1.2);
  spots.forEach(([x, z, label, dx, dy], i) => {
    const m = world.fx.reviewMarkers[i];
    const t0 = 1.5 + i * 0.9;
    tl.call(() => {
      m.visible = true;
      m.position.copy(skinPt(x, z, 0.0012));
      m.rotation.set(0, 0, 0);
      anno.add('rv' + i, m.position.clone(), label, { dx, dy, tone: 'neutral' });
    }, null, t0);
    pulse(tl, world, skinPt(x, z, 0.0015), null, { at: t0 + 0.1, scale: 0.8 });
    tl.call(() => {
      hud.tick(i);
      anno.setTone('rv' + i, 'teal');
    }, null, t0 + 0.6);
  });
  tl.call(() => hud.note('Sin alteraciones visibles', 'teal'), null, 1.5 + spots.length * 0.9 + 0.2);
  tl.to({}, { duration: 1.4 });
}

export function dressingField(ctx, tl) {
  const { world, sm, anno } = ctx;
  const f = world.aux.field;
  tl.add(sm.cameraTo(VIEWS.auxTable(), 1.4), 0);
  tl.call(() => {
    f.visible = true;
    f.scale.set(0.22, 1, 0.3);
  }, null, 0.9);
  drive(tl, 1.1, (t) => f.scale.set(lerp(0.22, 1, t), 1, lerp(0.3, 1, Math.min(1, t * 1.4))), { ease: 'power2.inOut', at: 0.9 });
  tl.call(() => anno.add('campo', f.position.clone().add(new THREE.Vector3(-0.2, 0.003, 0.14)), 'Campo estéril', { dx: -30, dy: 40, tone: 'teal', small: true }), null, 2.0);
  const end = revealAuxItems(tl, world, anno, ['gauze', 'solution', 'pack', 'gloves', 'forceps'], { start: 2.2, gap: 0.5 });
  tl.to({}, { duration: 1.0 }, end);
}

export function dressingCleaning(ctx, tl) {
  const { world, sm, anno } = ctx;
  tl.add(sm.cameraTo(view(skinPt(CX, 0), 0.42, 0.22, 1.05), 1.4), 0);
  showArrows(tl, world, anno, 1.0);
  tl.call(() => anno.add('una', skinPt(INCISION.x0 - 0.01, -0.045), 'Una pasada por gasa', { dx: -60, dy: 50, tone: 'neutral', small: true }), null, 1.3);
  tl.to({}, { duration: 0.1 }, 1.6);
  cleaningPasses(tl, world, world.tools.forcepsWet, PASSES_FULL, { speed: 1.25 });
  tl.to({}, { duration: 0.8 });
}

export function dressingDrying(ctx, tl) {
  const { world, sm, anno } = ctx;
  tl.add(sm.cameraTo(VIEWS.incision(), 1.3), 0);
  tl.call(() => anno.add('tool', () => world.tools.forcepsDry.position.clone().add(new THREE.Vector3(0, 0.06, 0.05)), 'Gasa estéril', { dx: 60, dy: -30, tone: 'neutral' }), null, 0.9);
  tl.to({}, { duration: 0.1 }, 1.0);
  dryDabs(tl, world, world.tools.forcepsDry, DAB_POINTS);
  tl.call(() => {
    anno.remove('tool');
    anno.add('seco', skinPt(CX, 0.04), 'Piel circundante seca', { dx: 50, dy: -50, tone: 'teal' });
  });
  tl.to({}, { duration: 1.0 });
}

export function dressingPlacement(ctx, tl) {
  const { world, sm, anno, hud } = ctx;
  const D = world.dressing;
  const g = D.group;
  tl.add(sm.cameraTo(view(skinPt(CX, 0), 0.46, 0.3, 0.92), 1.4), 0);
  const set = (dy, dz, yaw) => {
    g.position.set(DRESSING.cx, dy, dz);
    g.rotation.set(0, yaw, 0);
  };
  tl.call(() => {
    g.visible = true;
    D.set({ conform: 0, lift: 1, seal: 0 });
    set(0.14, 0.09, 0.6);
    anno.add('ap', () => g.position.clone().add(new THREE.Vector3(0, D.flatY + 0.004, 0)), 'Apósito estéril', { dx: 70, dy: -40, tone: 'neutral' });
  }, null, 1.0);
  drive(tl, 1.2, (t) => set(lerp(0.14, 0.035, t), lerp(0.09, 0, t), lerp(0.6, 0.25, t)), { ease: 'power2.out' }); // acercamiento
  drive(tl, 0.7, (t) => set(0.035, 0, lerp(0.25, 0, t)), { ease: 'power1.inOut' }); // alineación
  tl.call(() => anno.add('align', skinPt(INCISION.x1, 0, 0.004), 'Alineado con la incisión', { dx: 60, dy: 40, tone: 'blue', small: true }));
  drive(tl, 0.7, (t) => set(0.035 * (1 - t), 0, 0), { ease: 'power2.inOut' }); // descenso
  drive(tl, 0.9, (t) => D.set({ conform: t, lift: 1, seal: 0 }), { ease: 'power2.out' }); // cobertura
  tl.call(() => {
    anno.remove('align');
    anno.remove('ap');
    anno.add('cov', skinPt(CX, 0.03, 0.004), 'Incisión cubierta por completo', { dx: 60, dy: -50, tone: 'teal' });
  });
  pulse(tl, world, skinPt(CX, 0, 0.004), null, { scale: 2.2 });
  tl.to({}, { duration: 1.2 });
}

export function dressingFixation(ctx, tl) {
  const { world, sm, anno, hud } = ctx;
  const D = world.dressing;
  tl.add(sm.cameraTo(view(skinPt(CX, 0), 0.4, 0.34, 0.95), 1.3), 0);
  const presser = world.fx.reviewMarkers[0];
  tl.call(() => {
    D.set({ conform: 1, lift: 1, seal: 0 });
    presser.visible = true;
    presser.position.copy(D.edgePoint(0));
    hud.note('Presión suave: sin presión excesiva', 'blue');
    anno.add('fx', () => presser.position.clone(), 'Fijación progresiva del borde', { dx: 60, dy: -50, tone: 'neutral', small: true });
  }, null, 1.0);
  drive(tl, 3.6, (t) => {
    D.set({ seal: t });
    presser.position.copy(D.edgePoint(t));
  }, { ease: 'none', at: 1.2 });
  tl.call(() => {
    presser.visible = false;
    anno.remove('fx');
    anno.add('ok', skinPt(CX + 0.09, 0.05, 0.004), 'Bordes asegurados', { dx: 50, dy: -40, tone: 'teal' });
    hud.note('Fijado sin presión excesiva', 'teal');
  });
  tl.to({}, { duration: 1.2 });
}

export function dressingCheck(ctx, tl) {
  const { world, sm, hud, step } = ctx;
  tl.add(sm.cameraTo(view(skinPt(CX, 0), 0.42, 0.42, 0.9), 1.3), 0);
  const sc = world.fx.scan;
  const y = skinY(CX, 0);
  tl.call(() => {
    sc.visible = true;
    sc.scale.set(1, 0.6, 0.85);
    sc.position.set(CX - DRESSING.lx / 2 - 0.01, y, 0);
  }, null, 1.1);
  drive(tl, 2.4, (t) => sc.position.set(lerp(CX - DRESSING.lx / 2 - 0.01, CX + DRESSING.lx / 2 + 0.01, t), y, 0), { ease: 'sine.inOut', at: 1.1 });
  tl.call(() => {
    sc.visible = false;
    sc.scale.set(1, 1, 1);
  }, null, 3.6);
  tl.call(() => hud.checklist('Comprobación', step.checklist), null, 1.6);
  step.checklist.forEach((_, i) => tl.call(() => hud.tick(i), null, 2.0 + i * 0.5));
  tl.to({}, { duration: 1.4 }, 4.0);
}

export function dressingRecord(ctx, tl) {
  const { sm, hud, data } = ctx;
  tl.add(sm.cameraTo(VIEWS.overview(), 1.6), 0);
  tl.call(() => hud.record(data.record), null, 0.8);
  data.record.fields.forEach((_, i) => tl.call(() => hud.recordType(i), null, 1.3 + i * 0.75));
  tl.call(() => hud.recordComplete(), null, 1.3 + data.record.fields.length * 0.75 + 0.3);
  tl.to({}, { duration: 1.4 });
}

// ---------------------------------------------------------------- Etapa 6

export function finalCheck(ctx, tl) {
  const { sm, ui } = ctx;
  tl.add(sm.cameraTo(view(skinPt(CX, 0).add(new THREE.Vector3(-0.12, -0.05, 0)), 1.05, 0.36, 0.62), 1.6), 0);
  tl.add(sm.orbitTween(-0.28, 5), 1.6);
  const n = ctx.step.checklist.length;
  for (let i = 0; i < n; i++) tl.call(() => ui.panelTick?.(i), null, 1.4 + i * 0.5);
  tl.to({}, { duration: 0.6 }, 1.4 + n * 0.5);
}

export const DRESSING_ANIMATIONS = {
  'hand-hygiene': handHygiene,
  ppe,
  'sterile-field': sterileFieldPrep,
  antisepsis,
  'clean-prepare': cleanPrepare,
  'clean-observe': cleanObserve,
  'clean-solution': cleanSolution,
  'clean-direction': cleanDirection,
  'clean-dry': cleanDry,
  'dressing-hygiene': dressingHygiene,
  'wound-review': woundReview,
  'dressing-field': dressingField,
  'dressing-cleaning': dressingCleaning,
  'dressing-drying': dressingDrying,
  'dressing-placement': dressingPlacement,
  'dressing-fixation': dressingFixation,
  'dressing-check': dressingCheck,
  'dressing-record': dressingRecord,
  'final-check': finalCheck,
};

export { AUX_TABLE, show };
