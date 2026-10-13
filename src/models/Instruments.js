import * as THREE from 'three';
import { sweepGeometry, lathe, annularSectorShape, roundedCylinderProfile } from '../utils/geometry.js';
import { materials } from './materials.js';
import { rulerTexture } from '../utils/textures.js';
import { createScrew, createCap, SCREW, CAP } from './Implants.js';

// Instrumental quirúrgico procedural (ilustrativo, sin marca comercial).
// Convención: la punta de trabajo está en el origen y el instrumento se extiende hacia +Y.

function m(geo, mat) {
  const o = new THREE.Mesh(geo, mat);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}

function shaft(r, y0, y1, mat, seg = 18) {
  const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg);
  g.translate(0, (y0 + y1) / 2, 0);
  return m(g, mat);
}

function ring(r, y, tube = 0.0012, mat) {
  const g = new THREE.TorusGeometry(r, tube, 8, 32);
  g.rotateX(Math.PI / 2);
  g.translate(0, y, 0);
  return m(g, mat);
}

const HANDLES = {
  ergonomic: [[0.0035, 0], [0.0085, 0.006], [0.0118, 0.02], [0.0132, 0.05], [0.0122, 0.08], [0.0138, 0.098], [0.011, 0.108], [0.0001, 0.11]],
  pear: [[0.0035, 0], [0.0075, 0.01], [0.0148, 0.048], [0.0162, 0.068], [0.0132, 0.093], [0.006, 0.1], [0.0001, 0.101]],
  slim: [[0.003, 0], [0.0065, 0.008], [0.0088, 0.03], [0.0092, 0.07], [0.0082, 0.095], [0.0001, 0.1]],
  ratchet: [[0.005, 0], [0.011, 0.008], [0.015, 0.025], [0.0165, 0.06], [0.0158, 0.09], [0.0175, 0.108], [0.014, 0.118], [0.0001, 0.12]],
};

function handle(kind, y0, accent = true) {
  const M = materials();
  const g = new THREE.Group();
  const prof = HANDLES[kind];
  const len = prof[prof.length - 1][1];
  const h = m(lathe(prof, 36), M.handle);
  g.add(h);
  if (accent) {
    g.add(ring(prof[2][0] * 1.02, len * 0.18, 0.0016, M.accentBlue));
    g.add(ring(prof[3][0] * 0.98 + 0.0004, len * 0.62, 0.001, M.steel));
  }
  // Acanalado de agarre
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const groove = m(new THREE.CapsuleGeometry(0.0012, len * 0.35, 4, 8), M.handleLight);
    groove.position.set(Math.cos(a) * prof[3][0] * 0.98, len * 0.42, Math.sin(a) * prof[3][0] * 0.98);
    groove.scale.set(0.6, 1, 0.6);
    g.add(groove);
  }
  g.position.y = y0;
  g.userData.length = len;
  return g;
}

function tag(group, infoId, length) {
  group.userData.infoId = infoId;
  group.userData.length = length;
  return group;
}

// --------------------------------------------------------------------------

export function pedicleProbe() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'sonda-pedicular';
  const tipCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0018, 0, 0),
    new THREE.Vector3(0.0012, 0.012, 0),
    new THREE.Vector3(0, 0.03, 0),
  ]);
  g.add(m(sweepGeometry(tipCurve, { segments: 20, radial: 14, radius: (t) => 0.0011 + t * 0.0017 }), M.steel));
  g.add(shaft(0.0028, 0.03, 0.17, M.steel));
  g.add(ring(0.0034, 0.165, 0.0012, M.steelDark));
  g.add(handle('pear', 0.17));
  return tag(g, 'sonda-pedicular', 0.27);
}

export function pedicleFeeler() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'palpador';
  const ball = m(new THREE.SphereGeometry(0.0021, 16, 12), M.steel);
  ball.position.y = 0.002;
  g.add(ball);
  const bend = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.002, 0),
    new THREE.Vector3(0.0035, 0.014, 0),
    new THREE.Vector3(0.0035, 0.03, 0),
  ]);
  g.add(m(sweepGeometry(bend, { segments: 16, radial: 10, radius: 0.0012 }), M.steel));
  const s = shaft(0.0014, 0.03, 0.16, M.steel, 12);
  s.position.x = 0.0035;
  g.add(s);
  const h = handle('slim', 0.16);
  h.position.x = 0.0035;
  g.add(h);
  return tag(g, 'palpador', 0.26);
}

export function depthGauge() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'probador-profundidad';
  const ruler = rulerTexture();
  const rulerMat = new THREE.MeshPhysicalMaterial({ map: ruler, metalness: 0.7, roughness: 0.35 });
  const geo = new THREE.CylinderGeometry(0.0019, 0.0016, 0.11, 18, 1, true);
  geo.translate(0, 0.055, 0);
  g.add(m(geo, rulerMat));
  const tip = m(new THREE.SphereGeometry(0.0016, 12, 8), M.steel);
  g.add(tip);
  g.add(shaft(0.0024, 0.11, 0.17, M.steel));
  const collar = m(lathe(roundedCylinderProfile(0.0045, 0.008, 0.0015, 3, 0), 24), M.accentBlue);
  collar.position.y = 0.075;
  g.add(collar);
  g.add(handle('slim', 0.17));
  return tag(g, 'probador-profundidad', 0.27);
}

/** Destornillador/insertador con tornillo opcional acoplado. */
export function screwInserter({ withScrew = false } = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'insertador';
  const sleeveY0 = SCREW.ball + SCREW.tulipH - 0.004;
  const sleeve = m(lathe([
    [0.0072, sleeveY0], [0.0079, sleeveY0 + 0.001], [0.0079, sleeveY0 + 0.028], [0.0052, sleeveY0 + 0.034], [0.0001, sleeveY0 + 0.034],
  ], 32), M.steel);
  g.add(sleeve);
  g.add(shaft(0.0042, sleeveY0 + 0.03, 0.25, M.steel));
  g.add(ring(0.0048, 0.12, 0.0011, M.steelDark));
  const h = handle('ratchet', 0.25);
  g.add(h);
  const ratchetRing = m(new THREE.CylinderGeometry(0.0172, 0.0172, 0.009, 32), M.accentGold);
  ratchetRing.position.y = 0.25 + 0.112;
  g.add(ratchetRing);
  if (withScrew) {
    const sc = createScrew();
    g.add(sc);
    g.userData.screw = sc;
  }
  return tag(g, 'insertador', 0.37);
}

export function screwHolder() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'porta-tornillos';
  for (const c of [Math.PI / 2, -Math.PI / 2]) {
    const prong = new THREE.ExtrudeGeometry(annularSectorShape(0.0048, 0.0066, c - 0.85, c + 0.85, 12), { depth: 0.014, bevelEnabled: false });
    prong.rotateX(-Math.PI / 2);
    g.add(m(prong, M.steel));
  }
  g.add(shaft(0.0062, 0.014, 0.19, M.steel, 24));
  const wheel = m(lathe([[0.0062, 0], [0.012, 0.001], [0.012, 0.011], [0.0062, 0.012]], 24), M.steelDark);
  wheel.position.y = 0.16;
  g.add(wheel);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const k = m(new THREE.BoxGeometry(0.0012, 0.009, 0.0012), M.steel);
    k.position.set(Math.cos(a) * 0.0121, 0.1655, Math.sin(a) * 0.0121);
    g.add(k);
  }
  g.add(handle('slim', 0.19));
  return tag(g, 'porta-tornillos', 0.29);
}

export function capDriver({ withCap = false } = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'destornillador-caps';
  const hex = m(new THREE.CylinderGeometry(0.0019, 0.0019, 0.004, 6), M.steelDark);
  hex.position.y = 0.002;
  g.add(hex);
  g.add(shaft(0.0028, 0.004, 0.2, M.steel));
  g.add(ring(0.0034, 0.05, 0.0009, M.accentGold));
  g.add(handle('ergonomic', 0.2));
  if (withCap) {
    const cap = createCap();
    cap.position.y = -CAP.h / 2 + 0.0008;
    g.add(cap);
    g.userData.cap = cap;
  }
  return tag(g, 'destornillador-caps', 0.31);
}

function sleevedTube({ length, rOut, rIn, prongH, mat }) {
  const g = new THREE.Group();
  for (const c of [Math.PI / 2, -Math.PI / 2]) {
    const prong = new THREE.ExtrudeGeometry(annularSectorShape(rIn, rOut, c - 0.88, c + 0.88, 16), {
      depth: prongH, bevelEnabled: true, bevelThickness: 0.0005, bevelSize: 0.0004, bevelSegments: 1,
    });
    prong.rotateX(-Math.PI / 2);
    g.add(m(prong, mat));
  }
  const tube = lathe([
    [rIn, prongH], [rOut, prongH], [rOut, length - 0.002], [rOut - 0.0008, length], [rIn, length], [rIn, prongH],
  ], 40);
  g.add(m(tube, mat));
  return g;
}

/** Reductor de barras tipo torre. setPush(t) desplaza el empujador interno. */
export function rodReducer() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'reductor-barras';
  g.add(sleevedTube({ length: 0.13, rOut: 0.0098, rIn: 0.0078, prongH: 0.026, mat: M.steel }));
  const pusher = new THREE.Group();
  const pm = m(lathe([[0.0062, 0], [0.0074, 0.001], [0.0074, 0.12], [0.0062, 0.121]], 32), M.steelDark);
  pusher.add(pm);
  g.add(pusher);
  const knob = m(lathe((() => {
    const p = [[0.004, 0]];
    for (let i = 0; i <= 12; i++) p.push([0.0175 - (i % 2 ? 0.0012 : 0), 0.002 + i * 0.0018]);
    p.push([0.012, 0.027]);
    p.push([0.0001, 0.028]);
    return p;
  })(), 40), M.handle);
  knob.position.y = 0.132;
  g.add(knob);
  const tbar = m(new THREE.CapsuleGeometry(0.0062, 0.07, 6, 16), M.handle);
  tbar.rotation.z = Math.PI / 2;
  tbar.position.y = 0.168;
  g.add(tbar);
  g.add(ring(0.0101, 0.06, 0.001, M.accentBlue));
  g.userData.pusher = pusher;
  g.userData.knob = knob;
  g.userData.tbar = tbar;
  g.userData.setPush = (t) => {
    pusher.position.y = 0.034 - t * 0.022;
  };
  g.userData.setPush(0);
  return tag(g, 'reductor-barras', 0.18);
}

export function counterTorque() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'contra-torque';
  g.add(sleevedTube({ length: 0.12, rOut: 0.0102, rIn: 0.0082, prongH: 0.02, mat: M.steel }));
  const collar = m(new THREE.CylinderGeometry(0.0135, 0.0135, 0.018, 32), M.steelDark);
  collar.position.y = 0.105;
  g.add(collar);
  // Mango lateral perpendicular a las ranuras (hacia +Z)
  const arm = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.105, 0),
    new THREE.Vector3(0, 0.11, 0.05),
    new THREE.Vector3(0, 0.12, 0.13),
  ]);
  g.add(m(sweepGeometry(arm, { segments: 24, radial: 14, radius: 0.0048, up: new THREE.Vector3(1, 0, 0) }), M.steel));
  const grip = m(lathe(roundedCylinderProfile(0.011, 0.075, 0.004, 4, 0), 28), M.handle);
  grip.rotation.x = Math.PI / 2 - 0.12;
  grip.position.set(0, 0.116, 0.095);
  g.add(grip);
  return tag(g, 'contra-torque', 0.22);
}

export function torqueWrench() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'llave-dinamometrica';
  const hex = m(new THREE.CylinderGeometry(0.0019, 0.0019, 0.004, 6), M.steelDark);
  hex.position.y = 0.002;
  g.add(hex);
  g.add(shaft(0.0032, 0.004, 0.2, M.steel));
  const body = m(lathe([[0.004, 0], [0.012, 0.006], [0.0155, 0.02], [0.0155, 0.06], [0.013, 0.07], [0.0001, 0.072]], 40), M.handleLight);
  body.position.y = 0.2;
  g.add(body);
  g.add(ring(0.0158, 0.232, 0.0016, M.accentBlue));
  const windowMat = new THREE.MeshStandardMaterial({ color: '#0f2235', emissive: new THREE.Color('#0fa596'), emissiveIntensity: 0.0, roughness: 0.3 });
  const indicator = m(new THREE.BoxGeometry(0.006, 0.018, 0.004), windowMat);
  indicator.position.set(0, 0.245, 0.0152);
  g.add(indicator);
  const tbar = m(new THREE.CapsuleGeometry(0.0105, 0.11, 8, 20), M.handle);
  tbar.rotation.z = Math.PI / 2;
  tbar.position.y = 0.282;
  g.add(tbar);
  const hub = m(new THREE.CylinderGeometry(0.0135, 0.0135, 0.022, 28), M.steelDark);
  hub.position.y = 0.282;
  g.add(hub);
  g.userData.indicator = indicator;
  return tag(g, 'llave-dinamometrica', 0.3);
}

// --------------------------------------------------------------------------
// Instrumentos de tipo pinza (dos palancas articuladas)

/**
 * Pinza genérica. Plano de trabajo XY; bisagra en (0, jawLen). Las puntas
 * están cerca del origen y los mangos se extienden hacia +Y.
 */
export function plier({ handleLen = 0.2, jawLen = 0.03, style = 'holder', name = 'pinza' } = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = name;
  const levers = [];
  for (const side of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, jawLen, side * 0.0024);
    const L = new THREE.Group();
    L.position.set(0, -jawLen, 0);
    const jawW = style === 'forceps' ? 0.0026 : 0.0055;
    const jawR = style === 'forceps' ? 0.0017 : style === 'bender' ? 0.0052 : 0.0042;
    const jaw = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.0016, 0.001, 0),
      new THREE.Vector3(side * jawW, jawLen * 0.45, 0),
      new THREE.Vector3(0, jawLen, 0),
    ]);
    L.add(m(sweepGeometry(jaw, { segments: 16, radial: 12, radius: (t) => jawR * (0.75 + 0.25 * t), up: new THREE.Vector3(0, 0, 1) }), M.steel));
    const spread = style === 'forceps' ? 0.022 : 0.03;
    const hc = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, jawLen, 0),
      new THREE.Vector3(-side * spread * 0.55, jawLen + handleLen * 0.35, 0),
      new THREE.Vector3(-side * spread, jawLen + handleLen * 0.8, 0),
      new THREE.Vector3(-side * spread * 0.92, jawLen + handleLen, 0),
    ]);
    const hr = style === 'forceps' ? 0.0022 : 0.0042;
    L.add(m(sweepGeometry(hc, { segments: 30, radial: 12, radius: hr, up: new THREE.Vector3(0, 0, 1) }), M.steel));
    if (style === 'forceps') {
      const ringG = m(new THREE.TorusGeometry(0.0095, 0.0022, 10, 28), M.steel);
      ringG.position.set(-side * (spread * 0.92 + 0.004), jawLen + handleLen + 0.009, 0);
      L.add(ringG);
    } else {
      const grip = m(lathe(roundedCylinderProfile(0.0072, handleLen * 0.5, 0.003, 4, 0), 24), M.handle);
      const p0 = hc.getPoint(0.55);
      const p1 = hc.getPoint(1);
      grip.position.copy(p0);
      grip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
      L.add(grip);
    }
    // Detalles de la punta según el tipo
    if (style === 'cutter') {
      const blade = m(new THREE.BoxGeometry(0.004, 0.012, 0.007), M.steelDark);
      blade.position.set(side * 0.0026, 0.006, 0);
      L.add(blade);
    } else if (style === 'holder') {
      const pad = m(new THREE.BoxGeometry(0.003, 0.011, 0.008), M.steelDark);
      pad.position.set(side * 0.0028, 0.0055, 0);
      L.add(pad);
    } else if (style === 'bender') {
      const rollers = side > 0 ? [0] : [-0.011, 0.011];
      for (const ry of rollers) {
        const r = m(new THREE.CylinderGeometry(0.0062, 0.0062, 0.012, 24), M.steelDark);
        r.rotation.x = Math.PI / 2;
        r.position.set(side * 0.0068, 0.008 + ry * 0.4, 0);
        L.add(r);
      }
    } else if (style === 'persuader') {
      for (const dz of [-0.006, 0.006]) {
        const prong = m(new THREE.CapsuleGeometry(0.0018, 0.014, 4, 8), M.steelDark);
        prong.position.set(side * 0.003, 0.006, dz);
        L.add(prong);
      }
    }
    pivot.add(L);
    g.add(pivot);
    levers.push({ pivot, side });
  }
  const pin = m(new THREE.CylinderGeometry(0.0062, 0.0062, 0.012, 20), M.steelDark);
  pin.rotation.x = Math.PI / 2;
  pin.position.y = jawLen;
  g.add(pin);
  g.userData.setOpen = (a) => {
    levers.forEach(({ pivot, side }) => {
      pivot.rotation.z = side * a;
    });
  };
  g.userData.setOpen(0.02);
  return g;
}

export function rodBender() {
  return tag(plier({ handleLen: 0.24, jawLen: 0.034, style: 'bender', name: 'doblador-barras' }), 'doblador-barras', 0.28);
}
export function rodCutter() {
  return tag(plier({ handleLen: 0.26, jawLen: 0.026, style: 'cutter', name: 'cortador-barras' }), 'cortador-barras', 0.29);
}
export function rodHolder() {
  return tag(plier({ handleLen: 0.17, jawLen: 0.03, style: 'holder', name: 'pinza-porta-barras' }), 'pinza-porta-barras', 0.2);
}
export function persuader() {
  return tag(plier({ handleLen: 0.19, jawLen: 0.032, style: 'persuader', name: 'pinza-reductora' }), 'pinza-reductora', 0.22);
}
export function dressingForceps() {
  return tag(plier({ handleLen: 0.11, jawLen: 0.045, style: 'forceps', name: 'pinza-curacion' }), 'pinza-curacion', 0.17);
}

/** Medidor de barras (calibrador). setSpan(d) separa la mordaza móvil. */
export function rodCaliper() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'medidor-barras';
  const ruler = rulerTexture();
  const barMat = new THREE.MeshPhysicalMaterial({ map: ruler, metalness: 0.6, roughness: 0.35 });
  const bar = m(new THREE.BoxGeometry(0.13, 0.011, 0.0032), [M.steel, M.steel, M.steel, M.steel, barMat, M.steel]);
  bar.position.set(0.055, 0.042, 0);
  g.add(bar);
  const jawGeo = new THREE.BoxGeometry(0.0042, 0.04, 0.003);
  jawGeo.translate(0, 0.02, 0);
  const fixed = m(jawGeo, M.steel);
  g.add(fixed);
  const tipGeo = new THREE.ConeGeometry(0.0021, 0.005, 12);
  tipGeo.rotateX(Math.PI);
  tipGeo.translate(0, 0.0005, 0);
  fixed.add(m(tipGeo, M.steelDark));
  const slider = new THREE.Group();
  const sJaw = m(jawGeo, M.steel);
  sJaw.add(m(tipGeo, M.steelDark));
  const sBlock = m(new THREE.BoxGeometry(0.014, 0.016, 0.006), M.steelDark);
  sBlock.position.y = 0.042;
  slider.add(sJaw, sBlock);
  const thumb = m(new THREE.CylinderGeometry(0.004, 0.004, 0.003, 18), M.accentBlue);
  thumb.rotation.x = Math.PI / 2;
  thumb.position.set(0, 0.052, 0.002);
  slider.add(thumb);
  g.add(slider);
  g.userData.setSpan = (d) => {
    slider.position.x = d;
  };
  g.userData.setSpan(0.012);
  return tag(g, 'medidor-barras', 0.13);
}
