import * as THREE from 'three';
import { sweepGeometry, lathe, annularSectorShape, mergeGeometries, roundedCylinderProfile } from '../utils/geometry.js';
import { materials } from './materials.js';

// Implantes del sistema de instrumentación (geometría ilustrativa, no de un fabricante).
// Tornillo: origen en la parte superior del vástago; vástago hacia −Y.

export const SCREW = {
  length: 0.045,
  core: 0.0023,
  major: 0.0033,
  pitch: 0.0028,
  ball: 0.002, // centro de la cabeza esférica sobre el origen
  tulipH: 0.0145,
  tulipR: 0.0068,
  tulipRin: 0.0048,
  seat: 0.0047, // centro de la barra respecto al origen de la tulipa
};
export const ROD_R = 0.00275;
export const CAP = { r: 0.0045, h: 0.005, center: 0.0097 };

class HelixCurve extends THREE.Curve {
  constructor(r0, length, pitch, taper) {
    super();
    this.r0 = r0;
    this.length = length;
    this.turns = length / pitch;
    this.taper = taper;
  }
  getPoint(t, target = new THREE.Vector3()) {
    const y = -t * this.length;
    const a = t * this.turns * Math.PI * 2;
    const tip = Math.max(0, (t * this.length - (this.length - this.taper)) / this.taper);
    const r = this.r0 * (1 - 0.65 * tip);
    return target.set(Math.cos(a) * r, y, Math.sin(a) * r);
  }
}

let screwGeoCache = null;
function screwGeometries() {
  if (screwGeoCache) return screwGeoCache;
  const S = SCREW;
  const core = lathe([
    [0.0004, -S.length],
    [S.core * 0.45, -S.length + 0.003],
    [S.core * 0.9, -S.length + 0.008],
    [S.core, -S.length + 0.012],
    [S.core, -0.001],
    [S.core * 1.25, 0.0002],
    [S.core * 1.1, 0.0012],
  ], 24);
  const helix = new HelixCurve((S.core + S.major) / 2, S.length - 0.0015, S.pitch, 0.009);
  const thread = sweepGeometry(helix, {
    segments: 420,
    radial: 5,
    radius: (t) => 0.00062 * (1 - 0.5 * Math.max(0, (t - 0.82) / 0.18)),
    up: new THREE.Vector3(0, 1, 0),
    caps: false,
  });
  const ball = new THREE.SphereGeometry(0.0041, 24, 16);
  ball.translate(0, S.ball, 0);
  const strip = (g) => {
    const n = g.index ? g.toNonIndexed() : g;
    const o = new THREE.BufferGeometry();
    o.setAttribute('position', n.attributes.position);
    o.setAttribute('normal', n.attributes.normal);
    o.setAttribute('uv', n.attributes.uv);
    return o;
  };
  const shank = mergeGeometries([strip(core), strip(thread), strip(ball)]);

  // Tulipa (cabeza poliaxial en U) — ranura alineada con el eje X
  const arms = [];
  const beta = 0.98;
  for (const c of [Math.PI / 2, -Math.PI / 2]) {
    const shape = annularSectorShape(S.tulipRin, S.tulipR, c - beta, c + beta, 18);
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.0105, bevelEnabled: true, bevelThickness: 0.0005, bevelSize: 0.0004, bevelSegments: 2, curveSegments: 18,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0.0018, 0);
    arms.push(strip(g));
  }
  const base = lathe([
    [S.tulipRin * 0.85, -0.0032],
    [S.tulipR * 0.92, -0.0032],
    [S.tulipR, -0.0022],
    [S.tulipR, 0.0022],
    [S.tulipRin, 0.0022],
    [S.tulipRin * 0.9, 0.0018],
    [0.0001, 0.0018],
  ], 32);
  // Rosca interna sugerida
  const rings = [];
  for (let i = 0; i < 5; i++) {
    const r = new THREE.TorusGeometry(S.tulipRin, 0.00022, 4, 32);
    r.rotateX(Math.PI / 2);
    r.translate(0, 0.006 + i * 0.0012, 0);
    rings.push(strip(r));
  }
  const tulip = mergeGeometries([...arms, strip(base)]);
  const tulipRings = mergeGeometries(rings);
  screwGeoCache = { shank, tulip, tulipRings };
  return screwGeoCache;
}

/** Tornillo pedicular poliaxial. */
export function createScrew() {
  const M = materials();
  const G = screwGeometries();
  const g = new THREE.Group();
  g.name = 'tornillo-pedicular';
  const shankPivot = new THREE.Group();
  shankPivot.name = 'vastago';
  const shank = new THREE.Mesh(G.shank, M.titanium);
  shank.castShadow = true;
  shank.receiveShadow = true;
  shankPivot.add(shank);
  const tulip = new THREE.Group();
  tulip.name = 'tulipa';
  tulip.position.y = SCREW.ball;
  const tm = new THREE.Mesh(G.tulip, M.titaniumTulip);
  tm.castShadow = true;
  tm.receiveShadow = true;
  const tr = new THREE.Mesh(G.tulipRings, M.steelDark);
  tulip.add(tm, tr);
  g.add(shankPivot, tulip);
  g.userData = { shankPivot, tulip };
  return g;
}

let capGeo = null;
/** Cap / tuerca de bloqueo (set screw). Origen en su centro. */
export function createCap() {
  const M = materials();
  if (!capGeo) {
    const prof = [];
    const h = CAP.h;
    prof.push([0.0001, -h / 2]);
    prof.push([CAP.r * 0.85, -h / 2]);
    for (let i = 0; i <= 8; i++) {
      const y = -h / 2 + 0.0004 + (i / 8) * (h - 0.0012);
      prof.push([CAP.r - (i % 2 ? 0.00035 : 0), y]);
    }
    prof.push([CAP.r * 0.92, h / 2]);
    prof.push([0.0001, h / 2]);
    capGeo = {
      body: lathe(prof, 32),
      socket: new THREE.CylinderGeometry(0.0021, 0.0021, 0.0008, 6),
    };
    capGeo.socket.translate(0, h / 2, 0);
  }
  const g = new THREE.Group();
  g.name = 'cap-bloqueo';
  const b = new THREE.Mesh(capGeo.body, M.titaniumGold);
  b.castShadow = true;
  b.receiveShadow = true;
  const s = new THREE.Mesh(capGeo.socket, M.handle);
  g.add(b, s);
  return g;
}

/**
 * Barra con objetivo de forma (morph): 0 = recta, 1 = doblada según la curva.
 * curvePoints: puntos en coordenadas locales (la barra parte del origen).
 */
export function createRod(curvePoints, { segments = 90, radial = 18 } = {}) {
  const M = materials();
  const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'centripetal');
  const bentPts = curve.getSpacedPoints(segments);
  const L = curve.getLength();
  const start = bentPts[0].clone();
  const dir = bentPts[bentPts.length - 1].clone().sub(start).normalize();
  const straightPts = bentPts.map((_, i) => start.clone().addScaledVector(dir, (i / segments) * L));
  const radius = (t) => {
    const d = Math.min(t, 1 - t) * L;
    return ROD_R * Math.sqrt(Math.min(1, 0.25 + d / 0.0011));
  };
  const up = new THREE.Vector3(0, 1, 0);
  const straight = sweepGeometry(null, { points: straightPts, radial, radius, up });
  const bent = sweepGeometry(null, { points: bentPts, radial, radius, up });
  straight.morphAttributes.position = [bent.attributes.position];
  straight.morphAttributes.normal = [bent.attributes.normal];
  const m = new THREE.Mesh(straight, M.rod);
  m.name = 'barra';
  m.castShadow = true;
  m.receiveShadow = true;
  m.morphTargetInfluences = [0];
  m.userData = { length: L, start, dir, curve };
  return m;
}

/** Conector transversal (une ambas barras). */
export function createCrossConnector(span = 0.05) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'conector-transversal';
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, span, 16), M.titanium);
  bar.rotation.x = Math.PI / 2;
  bar.position.y = 0.006;
  g.add(bar);
  for (const side of [-1, 1]) {
    const clamp = new THREE.Group();
    const body = new THREE.Mesh(lathe(roundedCylinderProfile(0.0055, 0.009, 0.0015, 3, -0.0045), 24), M.titanium);
    body.rotation.z = Math.PI / 2;
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.0042, 0.0016, 10, 20, Math.PI * 1.25), M.titanium);
    hook.rotation.set(0, Math.PI / 2, Math.PI * 0.62);
    hook.position.y = -0.001;
    const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.003, 6), M.titaniumGold);
    nut.position.y = 0.0065;
    clamp.add(body, hook, nut);
    clamp.position.z = side * (span / 2);
    g.add(clamp);
  }
  const center = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.004, 6), M.titaniumGold);
  center.position.y = 0.0085;
  g.add(center);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/** Conector longitudinal tipo dominó (une dos barras en línea). */
export function createDomino() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'conector-longitudinal';
  const shape = new THREE.Shape();
  const w = 0.009;
  const l = 0.016;
  shape.moveTo(-l, -w);
  shape.lineTo(l, -w);
  shape.lineTo(l, w);
  shape.lineTo(-l, w);
  shape.closePath();
  for (const zc of [-0.0045, 0.0045]) {
    const hole = new THREE.Path();
    hole.absarc(0, zc, ROD_R * 1.05, 0, Math.PI * 2, true);
    void hole;
  }
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.009, 0.017), M.titanium);
  g.add(body);
  for (const z of [-0.0045, 0.0045]) {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(ROD_R * 1.1, ROD_R * 1.1, 0.0302, 16), M.steelDark);
    h.rotation.z = Math.PI / 2;
    h.position.z = z;
    g.add(h);
    for (const x of [-0.008, 0.008]) {
      const n = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.0012, 6), M.titaniumGold);
      n.position.set(x, 0.0048, z);
      g.add(n);
    }
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
