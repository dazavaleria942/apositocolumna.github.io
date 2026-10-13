import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export { mergeGeometries, mergeVertices };

const _v = new THREE.Vector3();

/**
 * Tubo de radio variable a lo largo de una curva.
 * Usa un vector "up" fijo para construir los marcos y así evitar torsiones,
 * lo que permite interpolar (morph) entre dos curvas con la misma topología.
 */
export function sweepGeometry(curve, {
  segments = 64,
  radial = 16,
  radius = 0.01,
  up = new THREE.Vector3(0, 1, 0),
  caps = true,
  points = null,
} = {}) {
  const pts = points || curve.getSpacedPoints(segments);
  const n = pts.length;
  const rFn = typeof radius === 'function' ? radius : () => radius;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const T = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();
  let prevN = null;

  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    if (i === 0) T.subVectors(pts[1], pts[0]);
    else if (i === n - 1) T.subVectors(pts[n - 1], pts[n - 2]);
    else T.subVectors(pts[i + 1], pts[i - 1]);
    T.normalize();
    N.copy(up).addScaledVector(T, -up.dot(T));
    if (N.lengthSq() < 1e-8) N.copy(prevN || new THREE.Vector3(1, 0, 0));
    N.normalize();
    prevN = N.clone();
    B.crossVectors(T, N).normalize();
    const r = rFn(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      _v.set(0, 0, 0).addScaledVector(N, c).addScaledVector(B, s);
      normals.push(_v.x, _v.y, _v.z);
      positions.push(pts[i].x + _v.x * r, pts[i].y + _v.y * r, pts[i].z + _v.z * r);
      uvs.push(t, j / radial);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = (i + 1) * (radial + 1) + j;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  if (caps) {
    for (const end of [0, n - 1]) {
      const centerIndex = positions.length / 3;
      const p = pts[end];
      const dir = end === 0 ? -1 : 1;
      const Tn = new THREE.Vector3();
      if (end === 0) Tn.subVectors(pts[1], pts[0]).normalize().multiplyScalar(-1);
      else Tn.subVectors(pts[n - 1], pts[n - 2]).normalize();
      positions.push(p.x, p.y, p.z);
      normals.push(Tn.x, Tn.y, Tn.z);
      uvs.push(0.5, 0.5);
      const ring = end * (radial + 1);
      const capStart = positions.length / 3;
      for (let j = 0; j <= radial; j++) {
        const k = (ring + j) * 3;
        positions.push(positions[k], positions[k + 1], positions[k + 2]);
        normals.push(Tn.x, Tn.y, Tn.z);
        uvs.push(0.5 + 0.5 * Math.cos((j / radial) * Math.PI * 2), 0.5 + 0.5 * Math.sin((j / radial) * Math.PI * 2));
      }
      for (let j = 0; j < radial; j++) {
        if (dir < 0) indices.push(centerIndex, capStart + j + 1, capStart + j);
        else indices.push(centerIndex, capStart + j, capStart + j + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  return g;
}

/** Torno a partir de un perfil [[radio, y], ...] (eje Y). */
export function lathe(profile, segments = 32) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.00001), y));
  const g = new THREE.LatheGeometry(pts, segments);
  g.computeVertexNormals();
  return g;
}

/** Perfil de cilindro con bordes redondeados para usar en lathe(). */
export function roundedCylinderProfile(r, h, bevel = 0.1, steps = 4, y0 = 0) {
  const b = Math.min(bevel, r * 0.9, h / 2);
  const p = [[0, y0]];
  for (let i = 0; i <= steps; i++) {
    const a = (-Math.PI / 2) + (i / steps) * (Math.PI / 2);
    p.push([r - b + Math.cos(a) * b, y0 + b + Math.sin(a) * b]);
  }
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 2);
    p.push([r - b + Math.cos(a) * b, y0 + h - b + Math.sin(a) * b]);
  }
  p.push([0, y0 + h]);
  return p;
}

/**
 * Malla de rejilla que se adapta a una superficie y = heightFn(x, z).
 * Devuelve la geometría y una función update(heightFn, extra) para animarla.
 */
export function conformGrid({ x0, x1, z0, z1, nx = 40, nz = 20, heightFn, offset = 0.001 }) {
  const g = new THREE.PlaneGeometry(1, 1, nx, nz);
  const pos = g.attributes.position;
  const base = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) + 0.5;
    const v = pos.getY(i) + 0.5;
    base[i * 2] = x0 + (x1 - x0) * u;
    base[i * 2 + 1] = z1 - (z1 - z0) * v;
  }
  function update(fn = heightFn, extra = null) {
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 2];
      const z = base[i * 2 + 1];
      let y = fn(x, z) + offset;
      if (extra) y += extra(x, z, i);
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
  }
  update();
  return { geometry: g, update, base };
}

/** Recorre un objeto y activa sombras. */
export function enableShadows(obj, cast = true, receive = true) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
  return obj;
}

/** Crea un Mesh con nombre y sombras. */
export function mesh(geometry, material, name = '') {
  const m = new THREE.Mesh(geometry, material);
  m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Forma 2D de sector anular (para cabezas de tornillo tipo tulipa). */
export function annularSectorShape(rIn, rOut, a0, a1, steps = 16) {
  const s = new THREE.Shape();
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (a1 - a0) * (i / steps);
    const x = Math.cos(a) * rOut;
    const y = Math.sin(a) * rOut;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  for (let i = steps; i >= 0; i--) {
    const a = a0 + (a1 - a0) * (i / steps);
    s.lineTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
  }
  s.closePath();
  return s;
}

/** Orienta un objeto para que su eje local -Y apunte en la dirección dada. */
export function alignDown(obj, dir) {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
  obj.quaternion.copy(q);
  return q;
}

export function boxOf(obj) {
  return new THREE.Box3().setFromObject(obj);
}
