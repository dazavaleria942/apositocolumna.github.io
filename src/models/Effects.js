import * as THREE from 'three';
import { sweepGeometry } from '../utils/geometry.js';

// Elementos visuales de apoyo: guías, marcadores, escaneo. Discretos y sin dramatismo.

const TEAL = '#14b3a3';
const BLUE = '#2f80ed';

export function overlayMaterial(color = BLUE, opacity = 0.9, depthTest = true) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest, toneMapped: false });
}

function noShadow(o) {
  o.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = false;
      c.receiveShadow = false;
      c.userData.noAO = true;
      c.userData.noHighlight = true;
    }
  });
  return o;
}

/** Anillo de marcación (p. ej. punto de entrada). Orientado según la normal. */
export function markerRing(radius = 0.004, color = BLUE, tube = 0.0006) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 40), overlayMaterial(color, 0.95, false));
  ring.rotation.x = Math.PI / 2;
  const dot = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.35, 20), overlayMaterial(color, 0.9, false));
  dot.rotation.x = -Math.PI / 2;
  const halo = new THREE.Mesh(new THREE.RingGeometry(radius * 1.2, radius * 1.65, 40), overlayMaterial(color, 0.25, false));
  halo.rotation.x = -Math.PI / 2;
  g.add(ring, dot, halo);
  g.renderOrder = 20;
  g.traverse((c) => (c.renderOrder = 20));
  g.userData.ring = ring;
  g.userData.halo = halo;
  return noShadow(g);
}

/** Línea discontinua entre puntos (visible a través del tejido). */
export function dashedPath(points, color = BLUE, { dash = 0.003, gap = 0.002, opacity = 0.95 } = {}) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineDashedMaterial({ color, dashSize: dash, gapSize: gap, transparent: true, opacity, depthTest: false, toneMapped: false });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  line.renderOrder = 25;
  line.userData.noHighlight = true;
  return line;
}

/** Tubo fino de color (corchete, líneas de medida). */
export function guideTube(points, color = BLUE, radius = 0.0005, depthTest = false) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0);
  const m = new THREE.Mesh(sweepGeometry(curve, { segments: Math.max(8, points.length * 6), radial: 8, radius, caps: true }), overlayMaterial(color, 0.95, depthTest));
  m.renderOrder = 22;
  return noShadow(m);
}

/** Flecha cónica. */
export function arrowHead(color = BLUE, size = 0.003) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(size * 0.6, size * 1.8, 16), overlayMaterial(color, 0.95, false));
  m.renderOrder = 23;
  return noShadow(m);
}

/** Cota de medida con flechas en ambos extremos. */
export function dimensionLine(a, b, color = BLUE) {
  const g = new THREE.Group();
  const line = guideTube([a, b], color, 0.00045);
  g.add(line);
  const dir = b.clone().sub(a).normalize();
  for (const [p, d] of [[a, dir.clone().negate()], [b, dir]]) {
    const h = arrowHead(color, 0.0035);
    h.position.copy(p);
    h.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    g.add(h);
  }
  g.userData.mid = a.clone().lerp(b, 0.5);
  return g;
}

/** Plano de escaneo con brillo suave. */
export function scanPlane(width = 0.13, height = 0.12, color = TEAL) {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(20,179,163,0)');
  grad.addColorStop(0.5, 'rgba(20,179,163,0.55)');
  grad.addColorStop(1, 'rgba(20,179,163,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 8, 256);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, opacity: 0.55, blending: THREE.AdditiveBlending });
  const g = new THREE.Group();
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  plane.rotation.y = Math.PI / 2;
  g.add(plane);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.0008, 0.0008, width), overlayMaterial(color, 0.9, false));
  g.add(edge);
  g.renderOrder = 30;
  g.traverse((o) => (o.renderOrder = 30));
  return noShadow(g);
}

/** Pulso circular que se expande y desvanece (se anima con setPulse(t)). */
export function pulseRing(radius = 0.01, color = TEAL) {
  const m = new THREE.Mesh(new THREE.RingGeometry(radius * 0.86, radius, 48), overlayMaterial(color, 0.8, false));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 24;
  noShadow(m);
  m.userData.setPulse = (t) => {
    const s = 0.4 + t * 1.2;
    m.scale.set(s, s, s);
    m.material.opacity = 0.85 * (1 - t);
  };
  return m;
}

/** Flecha plana sobre la piel (sentido de limpieza). */
export function flatArrow(length = 0.05, width = 0.012, color = TEAL) {
  const s = new THREE.Shape();
  const hw = width / 2;
  const head = width * 1.2;
  s.moveTo(0, -hw * 0.45);
  s.lineTo(length - head, -hw * 0.45);
  s.lineTo(length - head, -hw);
  s.lineTo(length, 0);
  s.lineTo(length - head, hw);
  s.lineTo(length - head, hw * 0.45);
  s.lineTo(0, hw * 0.45);
  s.closePath();
  const geo = new THREE.ShapeGeometry(s);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, overlayMaterial(color, 0.85, false));
  m.renderOrder = 26;
  return noShadow(m);
}

export const COLORS = { TEAL, BLUE };
