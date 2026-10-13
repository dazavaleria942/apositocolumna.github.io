import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { lathe, mesh } from '../utils/geometry.js';
import { materials } from './materials.js';
import { labelTexture, dressingMap } from '../utils/textures.js';
import { skinY } from './Patient.js';
import { INCISION } from '../scenes/layout.js';
import { smoothstep, clamp, lerp } from '../utils/math.js';
import { dressingForceps } from './Instruments.js';

// Material de curación: gasas, solución, apósito, guantes, campo estéril.

export function gauze({ size = 0.072, thick = 0.006 } = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'gasa';
  const body = mesh(new RoundedBoxGeometry(size, thick, size, 3, thick * 0.45), M.gauze, 'gasa');
  g.add(body);
  // Pliegue central sugerido
  const fold = mesh(new THREE.BoxGeometry(size * 0.96, 0.0006, 0.0012), new THREE.MeshStandardMaterial({ color: '#e9ecef', roughness: 1 }));
  fold.position.y = thick / 2 + 0.0001;
  g.add(fold);
  g.userData.infoId = 'gasas';
  return g;
}

/** Gasa sujetada con pinza (la pinza evita tocar la herida directamente). */
export function forcepsWithGauze() {
  const g = new THREE.Group();
  g.name = 'pinza-con-gasa';
  const f = dressingForceps();
  f.userData.setOpen(0.0);
  const gz = gauze({ size: 0.04, thick: 0.009 });
  gz.scale.set(1, 1, 0.75);
  gz.rotation.x = Math.PI / 2;
  gz.position.set(0, 0.015, 0);
  // La gasa doblada queda en la punta; el contacto con la piel está en el origen
  const holder = new THREE.Group();
  holder.add(f);
  f.position.y = 0.021;
  holder.add(gz);
  g.add(holder);
  g.userData.gauze = gz;
  g.userData.forceps = f;
  return g;
}

export function gauzeStack(n = 4) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const gz = gauze();
    gz.position.y = 0.003 + i * 0.0058;
    gz.rotation.y = (i % 2 ? 1 : -1) * 0.04;
    g.add(gz);
  }
  g.userData.infoId = 'gasas';
  g.name = 'gasas';
  return g;
}

export function solutionBottle() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'solucion';
  const body = mesh(lathe([
    [0.0001, 0], [0.026, 0], [0.029, 0.004], [0.029, 0.1], [0.024, 0.12], [0.011, 0.13], [0.011, 0.137], [0.0001, 0.137],
  ], 40), M.plasticWhite);
  g.add(body);
  const cap = mesh(lathe([[0.0001, 0.137], [0.0125, 0.137], [0.0125, 0.156], [0.009, 0.162], [0.0001, 0.163]], 32), M.plasticBlue);
  g.add(cap);
  const labelMat = new THREE.MeshStandardMaterial({
    map: labelTexture(['Solución indicada', 'Según protocolo', 'institucional']),
    roughness: 0.5,
  });
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.0292, 0.0292, 0.06, 40, 1, true, -Math.PI * 0.45, Math.PI * 0.9), labelMat);
  label.position.y = 0.055;
  g.add(label);
  g.userData.infoId = 'solucion';
  return g;
}

export function basin() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'cubeta';
  const bowl = mesh(lathe([
    [0.0001, 0], [0.04, 0], [0.052, 0.008], [0.058, 0.03], [0.061, 0.032], [0.0585, 0.033], [0.0555, 0.03], [0.05, 0.01], [0.04, 0.003], [0.0001, 0.003],
  ], 48), M.steel);
  g.add(bowl);
  const liquid = new THREE.Mesh(new THREE.CircleGeometry(0.052, 40), new THREE.MeshPhysicalMaterial({
    color: '#dfeaf2', roughness: 0.05, transmission: 0.4, transparent: true, opacity: 0.75,
  }));
  liquid.rotation.x = -Math.PI / 2;
  liquid.position.y = 0.017;
  g.add(liquid);
  g.userData.infoId = 'solucion';
  return g;
}

export function dressingPack() {
  const g = new THREE.Group();
  g.name = 'empaque-aposito';
  const mat = new THREE.MeshStandardMaterial({ map: labelTexture(['Apósito estéril', 'Uso único'], { w: 512, h: 256, accent: '#13a596' }), roughness: 0.55 });
  const side = new THREE.MeshStandardMaterial({ color: '#f4f6f7', roughness: 0.6 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.005, 0.11), [side, side, mat, side, side, side]);
  box.castShadow = true;
  box.receiveShadow = true;
  box.position.y = 0.0025;
  g.add(box);
  g.userData.infoId = 'aposito';
  return g;
}

/** Guante estéril plano (sobre el campo). */
export function glove(mirror = 1) {
  const M = materials();
  const g = new THREE.Group();
  const palm = mesh(new RoundedBoxGeometry(0.075, 0.012, 0.088, 3, 0.006), M.glove);
  g.add(palm);
  const fingers = [
    [-0.027, 0.055, 0.017],
    [-0.009, 0.064, 0.0175],
    [0.009, 0.062, 0.017],
    [0.026, 0.052, 0.0155],
  ];
  fingers.forEach(([x, len, r]) => {
    const f = mesh(new THREE.CapsuleGeometry(r * 0.48, len - r, 4, 10), M.glove);
    f.rotation.x = Math.PI / 2;
    f.position.set(x, 0, -0.044 - len / 2 + 0.006);
    f.scale.set(1, 1, 0.62);
    g.add(f);
  });
  const thumb = mesh(new THREE.CapsuleGeometry(0.0095, 0.04, 4, 10), M.glove);
  thumb.rotation.set(Math.PI / 2, 0, -0.8 * mirror);
  thumb.position.set(-0.046 * mirror, 0, -0.012);
  thumb.scale.set(1, 1, 0.62);
  g.add(thumb);
  const cuff = mesh(new RoundedBoxGeometry(0.08, 0.01, 0.06, 2, 0.004), M.glove);
  cuff.position.z = 0.072;
  g.add(cuff);
  g.scale.x = mirror;
  g.userData.infoId = 'guantes';
  return g;
}

/** Campo estéril sobre una mesa: tela que cae por los bordes. */
export function sterileField(w = 0.5, d = 0.36, drop = 0.05) {
  const M = materials();
  const geo = new THREE.PlaneGeometry(w + drop * 2, d + drop * 2, 60, 44);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const ox = Math.max(Math.abs(x) - w / 2, 0);
    const oz = Math.max(Math.abs(z) - d / 2, 0);
    const o = Math.hypot(ox, oz);
    const k = o > 0 ? 1 : 0;
    pos.setXYZ(
      i,
      x - Math.sign(x) * ox * 0.85 + Math.sign(x) * (ox > 0 ? 0.003 : 0),
      -o * 0.95 + 0.0015 * Math.sin(x * 60) * Math.sin(z * 50) * (1 - k) + 0.0015,
      z - Math.sign(z) * oz * 0.85 + Math.sign(z) * (oz > 0 ? 0.003 : 0),
    );
  }
  geo.computeVertexNormals();
  const f = mesh(geo, M.sterileField, 'campo-esteril');
  f.userData.infoId = 'campo-esteril';
  return f;
}

// --------------------------------------------------------------------------

export const DRESSING = {
  cx: (INCISION.x0 + INCISION.x1) / 2,
  lx: 0.235,
  lz: 0.104,
  pad: { lx: 0.17, lz: 0.052, h: 0.0032 },
};

/**
 * Apósito quirúrgico que se adapta a la curvatura de la espalda.
 * state: { conform: 0..1, lift: 0..1 (bordes sin fijar), seal: 0..1 (progreso de fijación) }
 */
export class SurgicalDressing {
  constructor() {
    const D = DRESSING;
    const nx = 72;
    const nz = 34;
    this.geo = new THREE.PlaneGeometry(D.lx, D.lz, nx, nz);
    this.geo.rotateX(-Math.PI / 2);
    const pos = this.geo.attributes.position;
    this.base = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      this.base[i * 2] = pos.getX(i);
      this.base[i * 2 + 1] = pos.getZ(i);
    }
    const padRect = [
      0.5 - D.pad.lx / D.lx / 2,
      0.5 - D.pad.lz / D.lz / 2,
      0.5 + D.pad.lx / D.lx / 2,
      0.5 + D.pad.lz / D.lz / 2,
    ];
    this.mat = new THREE.MeshPhysicalMaterial({
      map: dressingMap(padRect),
      roughness: 0.62,
      sheen: 0.4,
      sheenColor: new THREE.Color('#ffffff'),
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.name = 'aposito';
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group = new THREE.Group();
    this.group.name = 'aposito';
    this.group.position.set(D.cx, 0, 0);
    this.group.add(this.mesh);
    this.mesh.userData.infoId = 'aposito';
    this.state = { conform: 1, lift: 0, seal: 1 };
    this.flatY = Math.max(skinY(D.cx - D.lx / 2, 0), skinY(D.cx + D.lx / 2, 0), skinY(D.cx, 0)) + 0.004;
    this.update();
  }

  padOffset(lx, lz) {
    const D = DRESSING;
    const dx = Math.abs(lx) - D.pad.lx / 2;
    const dz = Math.abs(lz) - D.pad.lz / 2;
    const d = Math.max(dx, dz);
    return D.pad.h * (1 - smoothstep(-0.004, 0.0005, d));
  }

  set(partial) {
    Object.assign(this.state, partial);
    this.update();
  }

  update() {
    const D = DRESSING;
    const { conform, lift, seal } = this.state;
    const pos = this.geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const lx = this.base[i * 2];
      const lz = this.base[i * 2 + 1];
      const wx = D.cx + lx;
      const skin = skinY(wx, lz) + 0.0008;
      const yConf = skin;
      const yFlat = this.flatY;
      let y = lerp(yFlat, yConf, conform);
      y += this.padOffset(lx, lz);
      // Bordes: elevación hasta que se fijan
      const edgeD = Math.min(D.lx / 2 - Math.abs(lx), D.lz / 2 - Math.abs(lz));
      const edgeW = 1 - smoothstep(0, 0.022, edgeD);
      const ang = (Math.atan2(lz, lx) + Math.PI) / (Math.PI * 2);
      const sealed = clamp((seal - ang) * 8, 0, 1);
      y += lift * edgeW * 0.0035 * (1 - sealed);
      pos.setXYZ(i, lx, y, lz);
    }
    pos.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.geo.computeBoundingSphere();
  }

  /** Punto del borde (en el mundo) para el progreso de fijación t∈[0,1]. */
  edgePoint(t) {
    const D = DRESSING;
    const a = t * Math.PI * 2 - Math.PI;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const k = Math.min((D.lx / 2 - 0.006) / Math.abs(c || 1e-6), (D.lz / 2 - 0.006) / Math.abs(s || 1e-6));
    const lx = c * k;
    const lz = s * k;
    return new THREE.Vector3(D.cx + lx, skinY(D.cx + lx, lz) + 0.003, lz);
  }
}
