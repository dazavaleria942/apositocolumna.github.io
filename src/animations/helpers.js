import * as THREE from 'three';
import { gsap } from 'gsap';
import { WINDOW, INCISION, BACK_TABLE, AUX_TABLE } from '../scenes/layout.js';
import { skinY } from '../models/Patient.js';

// Utilidades compartidas por las animaciones de cada etapa.

const Y = new THREE.Vector3(0, 1, 0);
const NEG_Y = new THREE.Vector3(0, -1, 0);

/** Vista orbital: objetivo + distancia + acimut (desde +Z hacia +X) + elevación. */
export function view(target, dist, az = 0.3, el = 0.8) {
  const t = Array.isArray(target) ? new THREE.Vector3(...target) : target.clone();
  const p = new THREE.Vector3(
    Math.sin(az) * Math.cos(el) * dist,
    Math.sin(el) * dist,
    Math.cos(az) * Math.cos(el) * dist,
  ).add(t);
  return { position: p.toArray(), target: t.toArray() };
}

const incisionCenter = () => new THREE.Vector3((INCISION.x0 + INCISION.x1) / 2, skinY((INCISION.x0 + INCISION.x1) / 2, 0), 0);

export const VIEWS = {
  intro: () => view([-0.12, 0.98, 0], 3.1, 0.62, 0.42),
  overview: () => view([-0.08, 1.0, 0], 1.95, 0.42, 0.56),
  field: () => view([(WINDOW.x0 + WINDOW.x1) / 2, 1.1, 0], 0.72, 0.3, 0.92),
  incision: () => view(incisionCenter(), 0.4, 0.26, 0.92),
  spine: () => view([-0.002, 1.05, 0.004], 0.36, 0.42, 0.95),
  backTable: () => view([BACK_TABLE.center[0], BACK_TABLE.top, BACK_TABLE.center[2] + 0.02], 1.02, 0, 0.86),
  auxTable: () => view([AUX_TABLE.center[0], AUX_TABLE.top, AUX_TABLE.center[2]], 0.92, -0.25, 0.88),
};

/** Tween de un parámetro 0→1 que llama a fn(t) en cada actualización. */
export function drive(tl, duration, fn, { ease = 'power1.inOut', at } = {}) {
  const o = { t: 0 };
  tl.to(o, { t: 1, duration, ease, onUpdate: () => fn(o.t), onStart: () => fn(0) }, at);
  return tl;
}

/** Orienta una herramienta (punta en el origen, cuerpo hacia +Y) para que trabaje en la dirección dir. */
export function poseTool(tool, tip, dir, spin = 0, extraQ = null) {
  tool.position.copy(tip);
  const q = new THREE.Quaternion().setFromUnitVectors(NEG_Y, dir.clone().normalize());
  if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(Y, spin));
  if (extraQ) q.multiply(extraQ);
  tool.quaternion.copy(q);
}

/** Herramienta que se aproxima en línea recta por su eje, trabaja y se retira. */
export function approachPose(tool, target, dir, dist, spin = 0, extraQ = null) {
  const p = target.clone().addScaledVector(dir, -dist);
  poseTool(tool, p, dir, spin, extraQ);
}

export function show(tl, objs, v = true, at) {
  const arr = Array.isArray(objs) ? objs : [objs];
  tl.call(() => arr.forEach((o) => o && (o.visible = v)), null, at);
  return tl;
}

/** Pulso circular en un punto, orientado con el marco dado. */
export function pulse(tl, world, position, quaternion = null, { at, duration = 0.9, scale = 1 } = {}) {
  const p = world.fx.pulses.find((x) => !x.userData.busy) || world.fx.pulses[0];
  const o = { t: 0 };
  tl.to(o, {
    t: 1,
    duration,
    ease: 'power1.out',
    onStart: () => {
      p.userData.busy = true;
      p.visible = true;
      p.position.copy(position);
      if (quaternion) {
        p.quaternion.copy(quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)));
      } else {
        p.rotation.set(-Math.PI / 2, 0, 0);
      }
      p.scale.setScalar(scale);
    },
    onUpdate: () => {
      p.userData.setPulse(o.t);
      p.scale.multiplyScalar(scale);
    },
    onComplete: () => {
      p.visible = false;
      p.userData.busy = false;
    },
  }, at);
  return tl;
}

export const ease = {
  move: 'power2.inOut',
  settle: 'power3.out',
  lift: 'power2.in',
};

export { gsap, THREE };
