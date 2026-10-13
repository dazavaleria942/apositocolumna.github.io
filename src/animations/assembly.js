import { THREE, view, drive, poseTool, show, pulse, VIEWS } from './helpers.js';
import { SCREW, CAP, ROD_R } from '../models/Implants.js';
import { dimensionLine, dashedPath, guideTube, COLORS } from '../models/Effects.js';
import { INSTRUMENTED_LEVELS } from '../scenes/layout.js';
import { lerp, clamp } from '../utils/math.js';

// Etapa 4 — Técnica de ensamblaje. Cada función recibe el contexto y una línea
// de tiempo GSAP vacía, y añade la animación del paso.

const UP = new THREE.Vector3(0, 1, 0);
const LEVEL_NAMES = ['L1', 'L2', 'L3', 'L4', 'L5', 'S1'];

function screwOrder(world) {
  // Primero el lado cercano al observador (+Z), de craneal a caudal
  return [1, -1].flatMap((side) => INSTRUMENTED_LEVELS.map((lv) => world.slot(lv, side)));
}

function labelLevels(anno, world, at, tl) {
  tl.call(() => {
    LEVEL_NAMES.forEach((n) => {
      const g = world.spine.levels[n].group;
      const p = g.localToWorld(new THREE.Vector3(0, 0.0, -0.05));
      anno.add('lv-' + n, p, n, { dx: -22, dy: 0, tone: 'neutral', small: true, line: false, minor: !['L3', 'L4', 'L5'].includes(n) });
    });
  }, null, at);
}

function tulipTop(slot) {
  return slot.tulipOrigin.clone().addScaledVector(slot.f.up, SCREW.tulipH - 0.001);
}

/** Inserta un tornillo con el insertador. detail = incluye aproximación lenta. */
function insertScrew(tl, world, slot, { detail = false, at } = {}) {
  const ins = world.tools.inserter;
  const turns = 7;
  const L = SCREW.length;
  const poseBoth = (depth, spin) => {
    world.poseScrew(slot, depth, spin, 0);
    poseTool(ins, slot.screw.position, slot.dir, spin);
  };
  const tApproach = detail ? 0.9 : 0.32;
  const tInsert = detail ? 2.2 : 0.7;
  const tOut = detail ? 0.6 : 0.25;
  tl.call(() => {
    slot.screw.visible = true;
    ins.visible = true;
    poseBoth(-0.12, 0);
  }, null, at);
  drive(tl, tApproach, (t) => poseBoth(lerp(-0.12, 0, t), 0), { ease: 'power2.out' });
  drive(tl, tInsert, (t) => poseBoth(L * t, t * turns * Math.PI * 2), { ease: 'power1.inOut' });
  drive(tl, tOut, (t) => {
    const back = slot.screw.position.clone().addScaledVector(slot.dir, -0.12 * t);
    poseTool(ins, back, slot.dir, turns * Math.PI * 2);
  }, { ease: 'power2.in' });
  drive(tl, detail ? 0.5 : 0.25, (t) => world.poseScrew(slot, L, turns * Math.PI * 2, t), { ease: 'power2.out', at: '<' });
  tl.call(() => (ins.visible = false));
}

export function pedicleScrewPlacement(ctx, tl) {
  const { world, sm, anno, hud } = ctx;
  const order = screwOrder(world);
  const first = order[0];

  tl.call(() => hud.badge('Vista anatómica'), null, 0);
  tl.add(sm.cameraTo(VIEWS.spine(), 1.4), 0);
  drive(tl, 1.3, (t) => world.setXray(t), { at: 0.1, ease: 'power1.inOut' });
  labelLevels(anno, world, 1.2, tl);
  tl.call(() => {
    world.fx.bracket.visible = true;
    anno.add('nivel', world.fx.bracketAnchor, 'Nivel de instrumentación', { dx: 36, dy: -44, tone: 'blue' });
  }, null, 1.5);
  // Puntos de entrada
  order.forEach((s, i) => {
    const m = world.fx.entryMarkers[world.slots.indexOf(s)];
    show(tl, m, true, 2.1 + i * 0.12);
    pulse(tl, world, s.entry, s.f.quaternion, { at: 2.1 + i * 0.12, scale: 0.5 });
  });
  tl.call(() => anno.add('entrada', first.entry, 'Punto de entrada', { dx: 60, dy: 30, tone: 'blue' }), null, 2.6);

  // Detalle del primer tornillo: preparación del trayecto con la sonda
  tl.add(sm.cameraTo(view(first.tulipOrigin, 0.25, 0.75, 0.9), 1.2), 3.0);
  const probe = world.tools.probe;
  const traj = dashedPath([
    first.entry.clone().addScaledVector(first.dir, -0.012),
    first.entry.clone().addScaledVector(first.dir, SCREW.length),
  ], COLORS.BLUE, { dash: 0.0025, gap: 0.0018 });
  traj.visible = false;
  tl.call(() => {
    world.fx.temp.add(traj);
    probe.visible = true;
    poseTool(probe, first.entry.clone().addScaledVector(first.dir, -0.13), first.dir);
    anno.remove('entrada');
    anno.add('tool', () => probe.position.clone().addScaledVector(first.dir, -0.05), 'Sonda pedicular', { dx: 70, dy: -20, tone: 'neutral' });
  }, null, 3.6);
  drive(tl, 0.9, (t) => poseTool(probe, first.entry.clone().addScaledVector(first.dir, lerp(-0.13, 0, t)), first.dir), { ease: 'power2.out' });
  tl.call(() => (traj.visible = true));
  drive(tl, 1.3, (t) => poseTool(probe, first.entry.clone().addScaledVector(first.dir, 0.03 * t), first.dir, Math.sin(t * Math.PI * 4) * 0.35));
  tl.call(() => anno.add('tray', first.entry.clone().addScaledVector(first.dir, 0.03), 'Trayecto preparado', { dx: -150, dy: 40, tone: 'blue' }));
  drive(tl, 0.7, (t) => poseTool(probe, first.entry.clone().addScaledVector(first.dir, lerp(0.03, -0.14, t)), first.dir), { ease: 'power2.in' });
  tl.call(() => {
    probe.visible = false;
    anno.remove('tool');
  });

  // Inserción con el insertador
  tl.call(() => anno.add('tool', () => world.tools.inserter.position.clone().addScaledVector(first.dir, -0.06), 'Insertador + tornillo', { dx: 70, dy: -20, tone: 'neutral' }));
  insertScrew(tl, world, first, { detail: true });
  tl.call(() => {
    traj.visible = false;
    anno.remove('tool');
    anno.remove('tray');
    world.fx.entryMarkers[world.slots.indexOf(first)].visible = false;
  });
  pulse(tl, world, tulipTop(first), first.f.quaternion, { scale: 0.7 });

  // Resto de tornillos
  tl.add(sm.cameraTo(view(new THREE.Vector3(-0.002, 1.05, 0), 0.32, 0.5, 0.98), 1.0), '-=0.4');
  order.slice(1).forEach((s) => {
    insertScrew(tl, world, s, {});
    tl.call(() => (world.fx.entryMarkers[world.slots.indexOf(s)].visible = false));
    pulse(tl, world, tulipTop(s), s.f.quaternion, { scale: 0.6, at: '<' });
  });
  tl.call(() => {
    anno.add('ok', () => world.slot('L4', 1).tulipOrigin.clone().addScaledVector(world.slot('L4', 1).f.up, 0.02), 'Tornillos posicionados', { dx: 60, dy: -60, tone: 'teal' });
  });
  tl.to({}, { duration: 0.6 });
}

export function rodMeasurement(ctx, tl) {
  const { world, sm, anno, hud } = ctx;
  const r = world.rods[0];
  const s3 = world.slot('L3', 1);
  const s5 = world.slot('L5', 1);
  const a = tulipTop(s3);
  const b = tulipTop(s5);
  const axis = b.clone().sub(a).normalize();
  const up = r.up.clone();
  const z = new THREE.Vector3().crossVectors(axis, up).normalize();
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(axis, up, z));
  const span = a.distanceTo(b);
  const cal = world.tools.caliper;
  const mid = a.clone().lerp(b, 0.5);

  tl.call(() => hud.badge('Vista anatómica'), null, 0);
  tl.add(sm.cameraTo(view(mid.clone().add(new THREE.Vector3(0, 0.01, 0)), 0.22, 0.28, 0.98), 1.3), 0);
  tl.call(() => {
    cal.visible = true;
    cal.userData.setSpan(0.012);
    cal.position.copy(a).addScaledVector(up, 0.09);
    cal.quaternion.copy(q);
    anno.add('tool', () => cal.position.clone().addScaledVector(up, 0.05).addScaledVector(axis, 0.03), 'Medidor de barras', { dx: 50, dy: -40, tone: 'neutral' });
  }, null, 0.9);
  drive(tl, 0.9, (t) => cal.position.copy(a).addScaledVector(up, lerp(0.09, 0.0015, t)), { ease: 'power2.out' });
  pulse(tl, world, a, s3.f.quaternion, { scale: 0.5 });
  drive(tl, 1.5, (t) => cal.userData.setSpan(lerp(0.012, span, t)), { ease: 'power2.inOut', at: '<' });
  pulse(tl, world, b, s5.f.quaternion, { scale: 0.5 });
  const pa = a.clone().addScaledVector(up, 0.016);
  const pb = b.clone().addScaledVector(up, 0.016);
  const dim = dimensionLine(pa, pb, COLORS.BLUE);
  dim.visible = false;
  tl.call(() => {
    world.fx.temp.add(dim);
    dim.visible = true;
    anno.add('dist', dim.userData.mid.clone(), 'Distancia: según medición', { dx: 0, dy: -52, tone: 'blue' });
  });
  tl.to({}, { duration: 1.0 });
  // Trayecto de la barra (curvatura necesaria)
  const pathPts = r.localPts.map((p) => p.clone().applyQuaternion(r.q).add(r.seat0));
  const curve = new THREE.CatmullRomCurve3(pathPts, false, 'centripetal');
  const guide = dashedPath(curve.getSpacedPoints(40), COLORS.TEAL, { dash: 0.002, gap: 0.0015 });
  guide.visible = false;
  tl.call(() => {
    world.fx.temp.add(guide);
    guide.visible = true;
    anno.add('curva', pathPts[3].clone(), 'Curvatura del trayecto', { dx: 40, dy: 50, tone: 'teal' });
  });
  drive(tl, 0.8, (t) => cal.position.copy(a).addScaledVector(up, lerp(0.0015, 0.1, t)), { ease: 'power2.in', at: '+=0.6' });
  tl.call(() => {
    cal.visible = false;
    anno.remove('tool');
  });
  tl.to({}, { duration: 1.2 });
}

export function rodCutBend(ctx, tl) {
  const { world, sm, anno, hud } = ctx;
  const W = world.workRod;
  const cutter = world.tools.cutter;
  const bender = world.tools.bender;
  const markPt = world.workRodPoint(1);
  const midPt = world.workRodPoint(0.5);
  const axis = world.workRodPoint(1).sub(world.workRodPoint(0)).normalize();
  const center = world.workRodPoint(0.62);

  tl.call(() => hud.badge(null), null, 0);
  tl.add(sm.cameraTo(view(center.clone().add(new THREE.Vector3(0, 0.02, -0.03)), 0.3, 0.05, 0.82), 1.4), 0);
  tl.call(() => {
    anno.add('barra', world.workRodPoint(0.2), 'Barra recta', { dx: -40, dy: -46, tone: 'neutral' });
    anno.add('marca', markPt, 'Marca de la medición', { dx: 30, dy: -60, tone: 'blue' });
  }, null, 1.1);
  pulse(tl, world, markPt, null, { at: 1.4, scale: 0.6 });

  // Corte
  const side = new THREE.Vector3().crossVectors(UP, axis).normalize(); // horizontal, perpendicular a la barra
  const lean = new THREE.Vector3(0, 1, 0).addScaledVector(new THREE.Vector3(0, 0, -1), 0.5).normalize();
  const qCut = (() => {
    const x = side.clone();
    const y = lean.clone().addScaledVector(x, -lean.dot(x)).normalize();
    const zz = new THREE.Vector3().crossVectors(x, y);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, zz));
  })();
  const cutterAt = (k) => {
    cutter.position.copy(markPt).addScaledVector(lean, k);
    cutter.quaternion.copy(qCut);
  };
  tl.call(() => {
    cutter.visible = true;
    cutter.userData.setOpen(0.22);
    cutterAt(0.14);
    anno.remove('barra');
    anno.add('tool', () => cutter.position.clone().addScaledVector(lean, 0.12), 'Cortador de barras', { dx: 60, dy: -10, tone: 'neutral' });
  }, null, 2.2);
  drive(tl, 0.9, (t) => cutterAt(lerp(0.14, 0, t)), { ease: 'power2.out' });
  drive(tl, 0.35, (t) => cutter.userData.setOpen(lerp(0.22, 0.0, t)), { ease: 'power3.in' });
  pulse(tl, world, markPt, null, { scale: 0.5 });
  const home = W.excessHome.clone();
  const localAxis = W.rod.userData.dir.clone();
  drive(tl, 0.8, (t) => {
    W.excess.position.copy(home).addScaledVector(localAxis, 0.025 * t);
    W.excess.material.opacity = 1 - t;
  }, { ease: 'power2.out' });
  tl.call(() => {
    W.excess.visible = false;
    W.mark.visible = false;
    anno.remove('marca');
  });
  drive(tl, 0.6, (t) => {
    cutter.userData.setOpen(0.22 * t);
    cutterAt(0.16 * t);
  }, { ease: 'power2.in' });
  tl.call(() => {
    cutter.visible = false;
    anno.remove('tool');
  });

  // Doblado
  const benderAt = (k) => {
    bender.position.copy(midPt).addScaledVector(lean, k);
    bender.quaternion.copy(qCut);
  };
  tl.call(() => {
    bender.visible = true;
    bender.userData.setOpen(0.2);
    benderAt(0.15);
    anno.add('tool', () => bender.position.clone().addScaledVector(lean, 0.14), 'Doblador de barras', { dx: 60, dy: -10, tone: 'neutral' });
  });
  drive(tl, 0.9, (t) => benderAt(lerp(0.15, 0, t)), { ease: 'power2.out' });
  drive(tl, 1.0, (t) => {
    bender.userData.setOpen(lerp(0.2, 0.05, t));
    W.rod.morphTargetInfluences[0] = 0.55 * t;
  }, { ease: 'power1.inOut' });
  drive(tl, 0.35, (t) => bender.userData.setOpen(lerp(0.05, 0.16, t)));
  drive(tl, 1.0, (t) => {
    bender.userData.setOpen(lerp(0.16, 0.04, t));
    W.rod.morphTargetInfluences[0] = lerp(0.55, 1, t);
  }, { ease: 'power1.inOut' });
  drive(tl, 0.7, (t) => {
    bender.userData.setOpen(lerp(0.04, 0.2, t));
    benderAt(0.17 * t);
  }, { ease: 'power2.in' });
  tl.call(() => {
    bender.visible = false;
    anno.remove('tool');
    anno.add('ok', world.workRodPoint(0.5), 'Barra adaptada a la curvatura', { dx: 20, dy: -56, tone: 'teal' });
  });
  pulse(tl, world, world.workRodPoint(0.5), null, { scale: 0.9 });
  tl.to({}, { duration: 1.2 });
}

/** Coloca la pinza porta-barras sujetando la barra (punto local de agarre). */
function holderPose(world, r, holder) {
  const qLocal = new THREE.Quaternion()
    .setFromEuler(new THREE.Euler(-0.35, 0, 0))
    .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0)));
  r.pivot.updateMatrixWorld(true);
  r.tilt.updateMatrixWorld(true);
  const grip = r.tilt.localToWorld(new THREE.Vector3(0.024, 0, 0));
  holder.position.copy(grip);
  const wq = new THREE.Quaternion();
  r.tilt.getWorldQuaternion(wq);
  holder.quaternion.copy(wq).multiply(qLocal);
}

function placeRod(tl, world, r, { detail = true } = {}) {
  const holder = world.tools.rodHolder;
  const yawAxis = r.up.clone();
  const set = (off, yaw, proud) => {
    const q = new THREE.Quaternion().setFromAxisAngle(yawAxis, yaw);
    world.poseRod(r, { proud, offset: off, extraQ: q });
    holderPose(world, r, holder);
  };
  const d = detail ? 1 : 0.6;
  tl.call(() => {
    r.pivot.visible = true;
    holder.visible = true;
    holder.userData.setOpen(0.0);
    set(new THREE.Vector3(0.02, 0.11, 0.06), 0.9, 1);
  });
  drive(tl, 1.1 * d, (t) => set(new THREE.Vector3(lerp(0.02, 0, t), lerp(0.11, 0.028, t), lerp(0.06, 0, t)), lerp(0.9, 0.18, t), 1), { ease: 'power2.inOut' });
  drive(tl, 0.7 * d, (t) => set(new THREE.Vector3(0, 0.028 - 0.012 * t, 0), lerp(0.18, 0, t), 1), { ease: 'power1.inOut' });
  drive(tl, 0.8 * d, (t) => set(new THREE.Vector3(0, 0.016 * (1 - t), 0), 0, 1), { ease: 'power2.out' });
  drive(tl, 0.3, (t) => holder.userData.setOpen(0.16 * t));
  const startPos = new THREE.Vector3();
  tl.call(() => startPos.copy(holder.position));
  drive(tl, 0.6 * d, (t) => holder.position.copy(startPos).addScaledVector(UP, 0.12 * t), { ease: 'power2.in' });
  tl.call(() => (holder.visible = false));
}

export function rodPlacement(ctx, tl) {
  const { world, sm, anno, hud } = ctx;
  tl.call(() => hud.badge('Vista anatómica'), null, 0);
  tl.add(sm.cameraTo(view(new THREE.Vector3(-0.004, 1.06, 0.01), 0.3, 0.5, 0.92), 1.3), 0);
  tl.call(() => anno.add('tool', () => world.tools.rodHolder.position.clone().add(new THREE.Vector3(0, 0.07, 0.04)), 'Pinza porta-barras', { dx: 70, dy: -20, tone: 'neutral' }), null, 0.9);
  tl.to({}, { duration: 0.1 }, 1.0);
  placeRod(tl, world, world.rods[0], { detail: true });
  tl.call(() => anno.remove('tool'));
  placeRod(tl, world, world.rods[1], { detail: false });
  const s5 = world.slot('L5', 1);
  tl.call(() => {
    anno.add('asentada', () => world.slot('L3', 1).seat.clone().addScaledVector(world.slot('L3', 1).f.up, 0.012), 'Barra dentro de las cabezas', { dx: -60, dy: -56, tone: 'teal' });
    anno.add('pend', s5.seat.clone().addScaledVector(s5.f.up, 0.012), 'Pendiente de reducción', { dx: 60, dy: -50, tone: 'blue' });
  });
  pulse(tl, world, s5.seat.clone().addScaledVector(s5.f.up, 0.006), s5.f.quaternion, { scale: 0.6 });
  tl.to({}, { duration: 1.4 });
}

function reduceAt(tl, world, slot, rod, { detail = true, gapFx = null } = {}) {
  const red = world.tools.reducer;
  const up = slot.f.up;
  const base = slot.tulipOrigin.clone().addScaledVector(up, -0.0035);
  const at = (k) => {
    red.position.copy(base).addScaledVector(up, k);
    red.quaternion.copy(slot.f.quaternion);
  };
  const d = detail ? 1 : 0.55;
  tl.call(() => {
    red.visible = true;
    red.userData.setPush(0);
    at(0.13);
  });
  drive(tl, 1.0 * d, (t) => at(lerp(0.13, 0, t)), { ease: 'power2.out' });
  drive(tl, 1.8 * d, (t) => {
    red.userData.setPush(t);
    red.userData.knob.rotation.y = t * Math.PI * 4;
    red.userData.tbar.rotation.y = t * Math.PI * 4;
    world.poseRod(rod, { proud: 1 - t });
    if (gapFx) gapFx(1 - t);
  }, { ease: 'power1.inOut' });
  pulse(tl, world, slot.seat.clone().addScaledVector(up, 0.006), slot.f.quaternion, { scale: 0.6 });
  drive(tl, 0.7 * d, (t) => {
    red.userData.setPush(1 - t);
    at(0.14 * t);
  }, { ease: 'power2.in' });
  tl.call(() => (red.visible = false));
}

export function rodReduction(ctx, tl) {
  const { world, sm, anno, hud } = ctx;
  const s5 = world.slot('L5', 1);
  const r0 = world.rods[0];
  tl.call(() => hud.badge('Vista anatómica'), null, 0);
  tl.add(sm.cameraTo(view(s5.tulipOrigin.clone().addScaledVector(s5.f.up, 0.025), 0.26, 0.62, 0.88), 1.3), 0);
  // Indicador de separación barra–asiento
  const gapGroup = new THREE.Group();
  const seatPt = s5.seat.clone();
  const side = s5.f.z.clone().multiplyScalar(0.0105);
  const mk = (gap) => {
    gapGroup.clear();
    if (gap < 0.03) return;
    const top = seatPt.clone().addScaledVector(s5.f.up, 0.0048 * gap);
    gapGroup.add(guideTube([seatPt.clone().add(side), top.clone().add(side)], COLORS.BLUE, 0.00035));
  };
  tl.call(() => {
    world.fx.temp.add(gapGroup);
    mk(1);
    anno.add('gap', seatPt.clone().add(side).addScaledVector(s5.f.up, 0.003), 'Separación barra–asiento', { dx: 70, dy: 30, tone: 'blue' });
  }, null, 1.0);
  tl.call(() => anno.add('tool', () => world.tools.reducer.position.clone().addScaledVector(s5.f.up, 0.1), 'Reductor de barras', { dx: 60, dy: -10, tone: 'neutral' }), null, 1.6);
  tl.to({}, { duration: 0.1 }, 1.7);
  reduceAt(tl, world, s5, r0, { detail: true, gapFx: mk });
  tl.call(() => {
    anno.remove('gap');
    anno.remove('tool');
    anno.add('ok', s5.seat.clone().addScaledVector(s5.f.up, 0.01), 'Barra en posición', { dx: 60, dy: -40, tone: 'teal' });
  });
  // Lado opuesto
  const s5b = world.slot('L5', -1);
  tl.add(sm.cameraTo(view(new THREE.Vector3(0.02, 1.05, 0), 0.3, 0.45, 0.95), 0.9));
  reduceAt(tl, world, s5b, world.rods[1], { detail: false });
  tl.to({}, { duration: 0.8 });
}

function placeCap(tl, world, slot, { detail = false } = {}) {
  const drv = world.tools.capDriver;
  const up = slot.f.up;
  const dir = up.clone().negate();
  const finalTip = slot.capPos.clone().addScaledVector(up, CAP.h / 2 - 0.0008);
  const at = (k, spin = 0) => poseTool(drv, finalTip.clone().addScaledVector(up, k), dir, spin);
  const d = detail ? 1 : 0.4;
  tl.call(() => {
    drv.visible = true;
    drv.userData.cap.visible = true;
    at(0.11);
  });
  drive(tl, 0.9 * d, (t) => at(lerp(0.11, 0.009, t)), { ease: 'power2.out' });
  drive(tl, 0.9 * d, (t) => at(lerp(0.009, 0, t), t * Math.PI * 6), { ease: 'power1.inOut' });
  tl.call(() => {
    drv.userData.cap.visible = false;
    slot.cap.visible = true;
  });
  drive(tl, 0.5 * d, (t) => at(0.12 * t, Math.PI * 6), { ease: 'power2.in' });
  tl.call(() => (drv.visible = false));
}

export function capPlacement(ctx, tl) {
  const { world, sm, anno, hud } = ctx;
  const order = screwOrder(world);
  tl.call(() => hud.badge('Vista anatómica'), null, 0);
  tl.add(sm.cameraTo(view(order[0].tulipOrigin.clone().addScaledVector(order[0].f.up, 0.012), 0.22, 0.6, 0.9), 1.3), 0);
  tl.call(() => anno.add('tool', () => world.tools.capDriver.position.clone().add(new THREE.Vector3(0, 0.07, 0.02)), 'Destornillador de caps', { dx: 60, dy: -20, tone: 'neutral' }), null, 1.0);
  tl.to({}, { duration: 0.1 }, 1.1);
  placeCap(tl, world, order[0], { detail: true });
  tl.call(() => {
    anno.remove('tool');
    anno.add('cap', order[0].capPos.clone(), 'Cap de bloqueo', { dx: -70, dy: -50, tone: 'neutral' });
  });
  pulse(tl, world, order[0].capPos, order[0].f.quaternion, { scale: 0.5 });
  tl.add(sm.cameraTo(view(new THREE.Vector3(-0.002, 1.05, 0.004), 0.32, 0.45, 0.96), 1.0));
  order.slice(1).forEach((s) => {
    placeCap(tl, world, s, {});
    pulse(tl, world, s.capPos, s.f.quaternion, { scale: 0.45, at: '<' });
  });
  tl.call(() => anno.add('ok', world.slot('L4', 1).capPos.clone().addScaledVector(world.slot('L4', 1).f.up, 0.01), 'Fijación inicial', { dx: 60, dy: -50, tone: 'teal' }));
  tl.to({}, { duration: 1.0 });
}

export function finalTorque(ctx, tl) {
  const { world, sm, anno, hud } = ctx;
  const order = screwOrder(world);
  const tw = world.tools.torque;
  const ct = world.tools.counter;
  const first = world.slot('L4', 1);
  const flip = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI); // mango hacia el lado opuesto al observador
  const poseBoth = (slot, lift, twist = 0) => {
    const up = slot.f.up;
    ct.position.copy(slot.tulipOrigin).addScaledVector(up, -0.0035 + lift);
    ct.quaternion.copy(slot.f.quaternion).multiply(flip);
    const tip = slot.capPos.clone().addScaledVector(up, CAP.h / 2 + lift * 1.6);
    poseTool(tw, tip, up.clone().negate(), twist);
  };
  tl.call(() => hud.badge('Vista anatómica'), null, 0);
  tl.add(sm.cameraTo(view(first.tulipOrigin.clone().addScaledVector(first.f.up, 0.07), 0.42, 0.62, 0.52), 1.4), 0);
  tl.call(() => {
    ct.visible = true;
    poseBoth(first, 0.12);
    tw.visible = false;
    anno.add('ct', () => ct.position.clone().addScaledVector(first.f.up, 0.115).add(new THREE.Vector3(0, 0, -0.1)), 'Contra-torque', { dx: 50, dy: -30, tone: 'neutral' });
  }, null, 1.0);
  drive(tl, 0.9, (t) => {
    const up = first.f.up;
    ct.position.copy(first.tulipOrigin).addScaledVector(up, -0.0035 + 0.12 * (1 - t));
  }, { ease: 'power2.out' });
  tl.call(() => {
    tw.visible = true;
    poseTool(tw, first.capPos.clone().addScaledVector(first.f.up, CAP.h / 2 + 0.15), first.f.up.clone().negate());
    anno.add('tw', () => tw.position.clone().addScaledVector(first.f.up, 0.27), 'Llave dinamométrica', { dx: -150, dy: -10, tone: 'neutral' });
  });
  drive(tl, 1.0, (t) => poseTool(tw, first.capPos.clone().addScaledVector(first.f.up, CAP.h / 2 + 0.15 * (1 - t)), first.f.up.clone().negate()), { ease: 'power2.out' });
  tl.call(() => hud.torque.show());
  // Ajuste en incrementos
  const steps = 3;
  for (let i = 0; i < steps; i++) {
    drive(tl, 0.65, (t) => {
      const twist = ((i + t) / steps) * Math.PI * 0.75;
      poseTool(tw, first.capPos.clone().addScaledVector(first.f.up, CAP.h / 2), first.f.up.clone().negate(), twist);
      hud.torque.set((i + t) / steps);
    }, { ease: 'power1.inOut' });
    tl.to({}, { duration: 0.2 });
  }
  tl.call(() => {
    hud.torque.complete();
    tw.userData.indicator.material.emissiveIntensity = 1.4;
    first.mark.visible = true;
  });
  pulse(tl, world, first.capPos.clone().addScaledVector(first.f.up, 0.004), first.f.quaternion, { scale: 0.7 });
  tl.to({}, { duration: 0.7 });
  tl.call(() => {
    anno.remove('ct');
    anno.remove('tw');
    tw.userData.indicator.material.emissiveIntensity = 0;
    hud.torque.counter(1, 6);
  });
  // Resto de caps: el conjunto se traslada con un arco suave
  tl.add(sm.cameraTo(view(new THREE.Vector3(-0.002, 1.08, 0.004), 0.42, 0.55, 0.62), 1.0));
  let prev = first;
  const rest = order.filter((s) => s !== first);
  rest.forEach((s, idx) => {
    const from = prev;
    drive(tl, 0.75, (t) => {
      const lift = Math.sin(t * Math.PI) * 0.045;
      const k = t * t * (3 - 2 * t);
      const tmp = {
        f: { up: from.f.up.clone().lerp(s.f.up, k).normalize(), quaternion: from.f.quaternion.clone().slerp(s.f.quaternion, k) },
        tulipOrigin: from.tulipOrigin.clone().lerp(s.tulipOrigin, k),
        capPos: from.capPos.clone().lerp(s.capPos, k),
      };
      poseBoth(tmp, lift, 0);
    }, { ease: 'none' });
    drive(tl, 0.45, (t) => {
      poseBoth(s, 0, t * Math.PI * 0.75);
      hud.torque.set(t);
    });
    tl.call(() => {
      s.mark.visible = true;
      hud.torque.complete();
      hud.torque.counter(idx + 2, 6);
    });
    pulse(tl, world, s.capPos.clone().addScaledVector(s.f.up, 0.004), s.f.quaternion, { scale: 0.55, at: '<' });
    prev = s;
  });
  drive(tl, 0.7, (t) => poseBoth(prev, 0.15 * t, Math.PI * 0.75), { ease: 'power2.in' });
  tl.call(() => {
    tw.visible = false;
    ct.visible = false;
  });
  tl.to({}, { duration: 0.8 });
}

export function assemblyVerification(ctx, tl) {
  const { world, sm, anno, hud, step } = ctx;
  const center = new THREE.Vector3(-0.002, 1.055, 0.0);
  tl.call(() => hud.badge('Vista anatómica'), null, 0);
  tl.add(sm.cameraTo(view(center, 0.32, 0.12, 0.86), 1.3), 0);
  tl.add(sm.orbitTween(0.42, 5.5), 1.3);
  const sc = world.fx.scan;
  const xs = [world.slot('L3', 1).seat.x - 0.03, world.slot('L5', 1).seat.x + 0.03];
  const y = world.slot('L4', 1).seat.y - 0.01;
  tl.call(() => {
    sc.visible = true;
    sc.position.set(xs[0], y, 0);
  }, null, 1.4);
  drive(tl, 3.0, (t) => sc.position.set(lerp(xs[0], xs[1], t), y, 0), { ease: 'sine.inOut', at: 1.4 });
  INSTRUMENTED_LEVELS.forEach((lv, i) => {
    [1, -1].forEach((side) => {
      const s = world.slot(lv, side);
      pulse(tl, world, s.capPos.clone().addScaledVector(s.f.up, 0.004), s.f.quaternion, { scale: 0.55, at: 1.8 + i * 0.9 });
    });
  });
  tl.call(() => (sc.visible = false), null, 4.5);
  const items = step.checklist;
  tl.call(() => hud.checklist('Verificación', items), null, 4.4);
  items.forEach((_, i) => tl.call(() => hud.tick(i), null, 4.8 + i * 0.45));
  tl.call(() => hud.banner('ENSAMBLAJE COMPLETADO', 'Sistema verificado'), null, 4.8 + items.length * 0.45 + 0.2);
  tl.to({}, { duration: 1.6 });
}

export const ASSEMBLY_ANIMATIONS = {
  'pedicle-screw-placement': pedicleScrewPlacement,
  'rod-measurement': rodMeasurement,
  'rod-cut-bend': rodCutBend,
  'rod-placement': rodPlacement,
  'rod-reduction': rodReduction,
  'cap-placement': capPlacement,
  'final-torque': finalTorque,
  'assembly-verification': assemblyVerification,
};

export { clamp, ROD_R };
