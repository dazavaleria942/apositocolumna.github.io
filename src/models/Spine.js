import * as THREE from 'three';
import { mergeGeometries } from '../utils/geometry.js';
import { materials } from './materials.js';
import { torsoTop } from './Patient.js';

// Columna lumbar esquemática y educativa (L1–S1).
// Marco local de cada vértebra: X = craneocaudal (+ caudal), Y = posterior, Z = lateral.

const LEVELS = [
  { name: 'L1', h: 0.025 },
  { name: 'L2', h: 0.026 },
  { name: 'L3', h: 0.027 },
  { name: 'L4', h: 0.027 },
  { name: 'L5', h: 0.026 },
];
const DISCS = [0.009, 0.0095, 0.01, 0.0105, 0.011];
const DEPTH = 0.088; // de la piel al centro del cuerpo vertebral (nivel medio)
const X_L1 = -0.105;
// Lordosis lumbar: arco de radio R con vértice en XM (convexidad anterior)
const LORD_R = 0.21;
const LORD_XM = -0.03;

function kidneyShape(a = 0.024, b = 0.0175, notch = 0.0042) {
  const s = new THREE.Shape();
  const N = 56;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2;
    let x = Math.cos(t) * a;
    let y = Math.sin(t) * b;
    if (y > 0) y -= notch * Math.exp(-(x * x) / (0.011 * 0.011));
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  return s;
}

function bodyGeometry(h, scale = 1) {
  const bevel = 0.0022;
  const g = new THREE.ExtrudeGeometry(kidneyShape(0.024 * scale, 0.0175 * scale), {
    depth: Math.max(0.002, h - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: 0.0018,
    bevelSegments: 3,
    curveSegments: 40,
    steps: 1,
  });
  g.translate(0, 0, -(h - bevel * 2) / 2);
  g.rotateY(Math.PI / 2);
  return g;
}

function nonIndexed(g) {
  const n = g.index ? g.toNonIndexed() : g;
  if (!n.attributes.uv) {
    n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
  }
  return n;
}

function transformed(geo, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] }) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(...scale),
  );
  geo.applyMatrix4(m);
  return geo;
}

function posteriorElements(h) {
  const parts = [];
  // Pedículos
  for (const side of [-1, 1]) {
    parts.push(transformed(new THREE.CylinderGeometry(0.0052, 0.006, 0.021, 18), {
      pos: [0, 0.026, side * 0.0145], rot: [side * 0.16, 0, 0], scale: [1.35, 1, 1],
    }));
    // Apófisis transversas
    parts.push(transformed(new THREE.CapsuleGeometry(0.0032, 0.022, 6, 12), {
      pos: [0.001, 0.029, side * 0.031], rot: [Math.PI / 2, 0, side * -0.1], scale: [1.05, 1, 0.62],
    }));
    // Articulares superiores e inferiores
    parts.push(transformed(new THREE.SphereGeometry(1, 16, 12), {
      pos: [-h * 0.36, 0.0355, side * 0.0172], scale: [0.0072, 0.0056, 0.0046],
    }));
    parts.push(transformed(new THREE.SphereGeometry(1, 16, 12), {
      pos: [h * 0.44, 0.0365, side * 0.0112], scale: [0.0068, 0.005, 0.0042],
    }));
  }
  // Láminas (arco posterior)
  const arch = new THREE.TorusGeometry(0.0138, 0.0036, 14, 28, Math.PI);
  arch.rotateY(Math.PI / 2);
  parts.push(transformed(arch, { pos: [0.001, 0.0255, 0], scale: [2.2, 1, 1] }));
  // Apófisis espinosa
  const sp = new THREE.Shape();
  sp.moveTo(-0.0072, 0.034);
  sp.lineTo(0.0068, 0.034);
  sp.quadraticCurveTo(0.0105, 0.049, 0.0125, 0.0605);
  sp.quadraticCurveTo(0.0085, 0.065, 0.0025, 0.0635);
  sp.quadraticCurveTo(-0.0045, 0.056, -0.0072, 0.034);
  const spGeo = new THREE.ExtrudeGeometry(sp, {
    depth: 0.0032, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.0008, bevelSegments: 2, curveSegments: 10,
  });
  spGeo.translate(0, 0, -0.0016);
  parts.push(spGeo);
  return parts;
}

function vertebraGeometry(h) {
  const parts = [bodyGeometry(h), ...posteriorElements(h)].map(nonIndexed);
  return mergeGeometries(parts.map((g) => {
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', g.attributes.position);
    out.setAttribute('normal', g.attributes.normal);
    out.setAttribute('uv', g.attributes.uv);
    return out;
  }));
}

function sacrumGeometry() {
  const parts = [];
  parts.push(bodyGeometry(0.03, 1.08));
  // Alas sacras
  for (const side of [-1, 1]) {
    parts.push(transformed(new THREE.SphereGeometry(1, 20, 14), { pos: [0.006, 0.012, side * 0.034], scale: [0.02, 0.014, 0.022] }));
    parts.push(transformed(new THREE.SphereGeometry(1, 16, 12), { pos: [-0.012, 0.034, side * 0.017], scale: [0.007, 0.0055, 0.0048] }));
  }
  // Cuerpo sacro que continúa caudalmente
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.01, 0.01, 0),
    new THREE.Vector3(0.04, 0.012, 0),
    new THREE.Vector3(0.07, 0.02, 0),
    new THREE.Vector3(0.095, 0.03, 0),
  ]);
  const tube = new THREE.TubeGeometry(curve, 24, 1, 18, false);
  const pos = tube.attributes.position;
  // Escalar radialmente según avance para formar una cuña
  const pts = curve.getSpacedPoints(24);
  for (let i = 0; i < pos.count; i++) {
    const seg = Math.floor(i / 19);
    const c = pts[Math.min(seg, pts.length - 1)];
    const t = seg / 24;
    const rz = 0.034 * (1 - t * 0.65);
    const ry = 0.014 * (1 - t * 0.4);
    const dx = pos.getX(i) - c.x;
    const dy = pos.getY(i) - c.y;
    const dz = pos.getZ(i) - c.z;
    pos.setXYZ(i, c.x + dx * ry, c.y + dy * ry, c.z + dz * rz);
  }
  tube.computeVertexNormals();
  parts.push(tube);
  // Cresta sacra media
  parts.push(transformed(new THREE.CapsuleGeometry(0.0032, 0.05, 6, 10), { pos: [0.04, 0.03, 0], rot: [0, 0, Math.PI / 2 + 0.25], scale: [1, 1, 0.8] }));
  const merged = mergeGeometries(parts.map(nonIndexed).map((g) => {
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', g.attributes.position);
    out.setAttribute('normal', g.attributes.normal);
    out.setAttribute('uv', g.attributes.uv);
    return out;
  }));
  return merged;
}

export class Spine {
  constructor() {
    const M = materials();
    this.group = new THREE.Group();
    this.group.name = 'columna';
    this.levels = {};

    const xs = [];
    let x = X_L1;
    LEVELS.forEach((lv, i) => {
      if (i > 0) x += LEVELS[i - 1].h / 2 + DISCS[i - 1] + lv.h / 2;
      xs.push(x);
    });
    const xS1 = xs[4] + LEVELS[4].h / 2 + DISCS[4] + 0.015;

    const yAt = (xx) => torsoTop(xx, 0) - DEPTH + ((xx - LORD_XM) ** 2) / (2 * LORD_R);
    const tiltAt = (xx) => Math.atan2(yAt(xx + 0.01) - yAt(xx - 0.01), 0.02);

    LEVELS.forEach((lv, i) => {
      const g = new THREE.Group();
      g.name = 'vertebra-' + lv.name;
      g.position.set(xs[i], yAt(xs[i]), 0);
      g.rotation.z = tiltAt(xs[i]);
      const m = new THREE.Mesh(vertebraGeometry(lv.h), M.bone);
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
      this.group.add(g);
      this.levels[lv.name] = { name: lv.name, group: g, mesh: m, h: lv.h };
    });

    const s1 = new THREE.Group();
    s1.name = 'sacro';
    s1.position.set(xS1, torsoTop(xS1, 0) - 0.08, 0);
    s1.rotation.z = tiltAt(xs[4]) + 0.26;
    const sm = new THREE.Mesh(sacrumGeometry(), M.bone);
    sm.castShadow = true;
    sm.receiveShadow = true;
    s1.add(sm);
    this.group.add(s1);
    this.levels.S1 = { name: 'S1', group: s1, mesh: sm, h: 0.03 };

    // Discos intervertebrales
    const names = ['L1', 'L2', 'L3', 'L4', 'L5', 'S1'];
    for (let i = 0; i < 5; i++) {
      const a = this.levels[names[i]].group;
      const b = this.levels[names[i + 1]].group;
      const p = a.position.clone().lerp(b.position, 0.5);
      if (i === 4) p.y += 0.002;
      const disc = new THREE.Mesh(bodyGeometry(DISCS[i] + 0.0016, 0.985), M.disc);
      disc.position.copy(p);
      disc.rotation.z = (a.rotation.z + b.rotation.z) / 2 - (i === 4 ? 0.12 : 0);
      disc.castShadow = true;
      disc.receiveShadow = true;
      this.group.add(disc);
    }
    this.group.updateMatrixWorld(true);
  }

  frame(level) {
    const g = this.levels[level].group;
    g.updateMatrixWorld(true);
    const q = new THREE.Quaternion();
    g.getWorldQuaternion(q);
    return {
      origin: g.getWorldPosition(new THREE.Vector3()),
      x: new THREE.Vector3(1, 0, 0).applyQuaternion(q),
      up: new THREE.Vector3(0, 1, 0).applyQuaternion(q),
      z: new THREE.Vector3(0, 0, 1).applyQuaternion(q),
      quaternion: q,
    };
  }

  /** Punto de entrada pedicular (side: +1 / −1). */
  entry(level, side) {
    return this.levels[level].group.localToWorld(new THREE.Vector3(0, 0.0372, side * 0.0205));
  }

  /** Dirección de la trayectoria (convergente hacia medial y anterior). */
  trajectory(level, side) {
    const q = this.frame(level).quaternion;
    return new THREE.Vector3(0, -1, -side * 0.3).normalize().applyQuaternion(q);
  }

  levelCenter(level) {
    return this.levels[level].group.localToWorld(new THREE.Vector3(0, 0.02, 0));
  }
}
