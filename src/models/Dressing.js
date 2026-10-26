import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { lathe, mesh } from '../utils/geometry.js';
import { materials } from './materials.js';
import { labelTexture, dressingMap } from '../utils/textures.js';
import { skinY } from './Patient.js';
import { INCISION } from '../scenes/layout.js';
import { smoothstep, clamp, lerp, makeValueNoise, rng } from '../utils/math.js';
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
    this.cond = null;
    this.material = 'silicona';
    this.baseMap = this.mat.map;
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
    const c = this.cond;
    const cotton = this.material === 'algodon';
    const pos = this.geo.attributes.position;
    const corners = [[D.lx / 2, D.lz / 2], [-D.lx / 2, D.lz / 2], [D.lx / 2, -D.lz / 2], [-D.lx / 2, -D.lz / 2]];
    for (let i = 0; i < pos.count; i++) {
      const lx = this.base[i * 2];
      const lz = this.base[i * 2 + 1];
      const wx = D.cx + lx;
      const skin = skinY(wx, lz) + 0.0008;
      const yConf = skin;
      const yFlat = this.flatY;
      let y = lerp(yFlat, yConf, conform);
      let pad = this.padOffset(lx, lz);
      // Bordes: elevación hasta que se fijan
      const edgeD = Math.min(D.lx / 2 - Math.abs(lx), D.lz / 2 - Math.abs(lz));
      const edgeW = 1 - smoothstep(0, 0.022, edgeD);
      const ang = (Math.atan2(lz, lx) + Math.PI) / (Math.PI * 2);
      const sealed = clamp((seal - ang) * 8, 0, 1);
      y += lift * edgeW * 0.0035 * (1 - sealed);
      if (c) {
        // Seguimiento posquirúrgico: abultamiento, arrugas y esquinas despegadas
        if (cotton) pad = pad * 1.35 + (pad > 0.0005 ? 0.0004 * Math.sin(lx * 260) * Math.sin(lz * 230) : 0);
        pad *= 1 + c.swell * 0.55;
        const wr = c.wrinkle * (0.4 + 0.6 * edgeW) * (cotton ? 0.0026 : 0.0014);
        y += wr * Math.sin(lx * 170 + lz * 55 + Math.sin(lz * 90) * 1.5) * Math.sin(lz * 120 - lx * 30);
        for (let k = 0; k < 4; k++) {
          const L = c.lift[k];
          if (L <= 0.001) continue;
          const R = 0.018 + 0.05 * L;
          const d = Math.hypot(lx - corners[k][0], lz - corners[k][1]);
          const w = 1 - smoothstep(0, R, d);
          y += L * 0.011 * w * w;
        }
      }
      y += pad;
      pos.setXYZ(i, lx, y, lz);
    }
    pos.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.geo.computeBoundingSphere();
  }

  // ---------------------------------------------------------------- seguimiento posquirúrgico

  /** Aplica el estado de evolución (material + condición) o lo retira (null). */
  setCondition(material, cond) {
    if (!cond) {
      if (this.cond) {
        this.cond = null;
        this.mat.map = this.baseMap;
        this.mat.roughnessMap = null;
        this.mat.roughness = 0.62;
        this.mat.alphaTest = 0;
        this.mat.sheen = 0.4;
        this.mat.sheenRoughness = 1;
        this.mat.needsUpdate = true;
        this.update();
      }
      return;
    }
    if (!this.condCanvas) this.initConditionCanvas();
    const changedMaterial = material !== this.material || !this.cond;
    this.material = material;
    this.cond = cond;
    drawCondition(this, material, cond);
    if (changedMaterial) {
      this.mat.map = this.condTex;
      this.mat.roughnessMap = this.roughTex;
      this.mat.roughness = 1;
      this.mat.alphaTest = 0.5;
      this.mat.sheen = material === 'algodon' ? 0.22 : 0.12;
      this.mat.sheenRoughness = 0.9;
      this.mat.needsUpdate = true;
    }
    this.update();
  }

  initConditionCanvas() {
    const small = Math.min(window.innerWidth, window.innerHeight) < 600;
    const W = small ? 768 : 1024;
    const H = Math.round(W * (DRESSING.lz / DRESSING.lx));
    this.condCanvas = document.createElement('canvas');
    this.condCanvas.width = W;
    this.condCanvas.height = H;
    this.roughCanvas = document.createElement('canvas');
    this.roughCanvas.width = W / 4;
    this.roughCanvas.height = Math.round(H / 4);
    this.condTex = new THREE.CanvasTexture(this.condCanvas);
    this.condTex.colorSpace = THREE.SRGBColorSpace;
    this.condTex.anisotropy = 8;
    this.roughTex = new THREE.CanvasTexture(this.roughCanvas);
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

// ---------------------------------------------------------------- texturas de evolución

const patterns = {};
function patternCanvas(key, size, draw) {
  if (!patterns[key]) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    patterns[key] = c;
  }
  return patterns[key];
}

const foamPattern = () => patternCanvas('foam', 128, (ctx, n) => {
  const r = rng(12);
  ctx.fillStyle = '#f1ece3';
  ctx.fillRect(0, 0, n, n);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(140,135,128,${0.06 + r() * 0.1})`;
    ctx.beginPath();
    ctx.arc(r() * n, r() * n, 0.6 + r() * 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
});

const gauzePattern = () => patternCanvas('gauze', 64, (ctx, n) => {
  ctx.fillStyle = '#efeee8';
  ctx.fillRect(0, 0, n, n);
  ctx.strokeStyle = 'rgba(170,168,156,0.6)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i <= n; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i + 0.5, 0);
    ctx.lineTo(i + 0.5, n);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i + 0.5);
    ctx.lineTo(n, i + 0.5);
    ctx.stroke();
  }
});

const tapePattern = () => patternCanvas('tape', 64, (ctx, n) => {
  ctx.fillStyle = '#e6dfd2';
  ctx.fillRect(0, 0, n, n);
  ctx.strokeStyle = 'rgba(200,190,170,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < n; i += 3) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, n);
    ctx.stroke();
  }
});

const grimePattern = () => patternCanvas('grime', 256, (ctx, n) => {
  const noise = makeValueNoise(77, 32);
  const img = ctx.createImageData(n, n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const v = noise(x / 22, y / 22) * 0.6 + noise(x / 7, y / 7) * 0.4;
      const i = (y * n + x) * 4;
      img.data[i] = 120;
      img.data[i + 1] = 108;
      img.data[i + 2] = 86;
      img.data[i + 3] = Math.max(0, (v - 0.35) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
});

const stainNoise = makeValueNoise(5, 64);

/** Contorno irregular de una mancha elíptica (coordenadas de canvas). */
function blobPath(ctx, cx, cy, rx, ry, seed = 0, rough = 0.16) {
  const N = 64;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const n = stainNoise(Math.cos(a) * 2.2 + seed, Math.sin(a) * 2.2 + seed * 0.7) - 0.5;
    const n2 = stainNoise(Math.cos(a) * 5 + 11 + seed, Math.sin(a) * 5 - 3) - 0.5;
    const k = 1 + n * rough * 2 + n2 * rough * 0.8;
    const x = cx + Math.cos(a) * rx * k;
    const y = cy + Math.sin(a) * ry * k;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function stainColor(c, alpha) {
  // serohemático (rosado parduzco) → seroso (amarillo pajizo); pus: amarillo cremoso verdoso
  const sh = [170, 92, 80];
  const se = [200, 162, 92];
  const pu = [168, 150, 78];
  const t = Math.min(1, c.hue / 0.7);
  let col = sh.map((v, i) => v + (se[i] - v) * t);
  if (c.pus > 0) col = col.map((v, i) => v + (pu[i] - v) * c.pus);
  return `rgba(${col.map((v) => Math.round(v)).join(',')},${alpha})`;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Dibuja la textura de color y de rugosidad del apósito según material y condición. */
function drawCondition(dr, material, c) {
  const D = DRESSING;
  const cv = dr.condCanvas;
  const ctx = cv.getContext('2d');
  const W = cv.width;
  const H = cv.height;
  const s = W / 1024;
  const px0 = (0.5 - D.pad.lx / D.lx / 2) * W;
  const px1 = (0.5 + D.pad.lx / D.lx / 2) * W;
  const py0 = (0.5 - D.pad.lz / D.lz / 2) * H;
  const py1 = (0.5 + D.pad.lz / D.lz / 2) * H;
  const pw = px1 - px0;
  const ph = py1 - py0;
  const cotton = material === 'algodon';
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';

  // Base
  if (cotton) {
    ctx.fillStyle = ctx.createPattern(tapePattern(), 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = ctx.createPattern(gauzePattern(), 'repeat');
    roundRectPath(ctx, px0 - 10 * s, py0 - 8 * s, pw + 20 * s, ph + 16 * s, 8 * s);
    ctx.fill();
    ctx.strokeStyle = 'rgba(205,200,188,0.8)';
    ctx.lineWidth = 2 * s;
    for (let k = 1; k <= 3; k++) {
      ctx.beginPath();
      ctx.moveTo(px0 - 6 * s, py0 + (ph * k) / 4);
      ctx.lineTo(px1 + 6 * s, py0 + (ph * k) / 4 + 2 * s);
      ctx.stroke();
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#e9dccb');
    g.addColorStop(1, '#e2d1bd');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(170,145,120,0.22)';
    for (let y = 8 * s; y < H; y += 14 * s) for (let x = 8 * s; x < W; x += 14 * s) ctx.fillRect(x, y, 2 * s, 2 * s);
    ctx.fillStyle = ctx.createPattern(foamPattern(), 'repeat');
    roundRectPath(ctx, px0, py0, pw, ph, 28 * s);
    ctx.fill();
  }

  // Exudado (contenido en la almohadilla; en algodón puede alcanzar el borde)
  if (c.stain > 0.005) {
    const area = c.stain * pw * ph;
    const a = (pw / ph) * 0.92;
    let rx = Math.sqrt((area * a) / Math.PI);
    let ry = rx / a;
    const cx = W / 2 + 6 * s;
    const cy = H / 2 + 2 * s;
    ctx.save();
    if (!cotton) {
      roundRectPath(ctx, px0 + 5 * s, py0 + 5 * s, pw - 10 * s, ph - 10 * s, 24 * s);
      ctx.clip();
    } else {
      roundRectPath(ctx, px0 - 26 * s, py0 - 22 * s, pw + 52 * s, ph + 44 * s, 10 * s);
      ctx.clip();
    }
    const strength = cotton ? 0.6 + 0.35 * c.strike : 0.48 + 0.18 * c.wet;
    ctx.filter = `blur(${(cotton ? 3 : 9) * s}px)`;
    blobPath(ctx, cx, cy, rx * 1.05, ry * 1.05, 1.3);
    ctx.fillStyle = stainColor(c, strength * 0.65);
    ctx.fill();
    blobPath(ctx, cx - 10 * s, cy, rx * 0.62, ry * 0.6, 4.1);
    ctx.fillStyle = stainColor({ ...c, hue: c.hue * 0.6 }, strength * 0.8);
    ctx.fill();
    ctx.filter = 'none';
    // Línea de marea (borde de la mancha) y costra en el algodón
    blobPath(ctx, cx, cy, rx * 1.05, ry * 1.05, 1.3);
    ctx.strokeStyle = cotton ? `rgba(140,92,54,${0.25 + c.crust * 0.6})` : `rgba(160,120,80,${0.12 + c.stain * 0.2})`;
    ctx.lineWidth = (cotton ? 3 + c.crust * 6 : 2.5) * s;
    ctx.stroke();
    if (c.pus > 0) {
      const r = rng(31);
      for (let i = 0; i < 9; i++) {
        blobPath(ctx, cx + (r() - 0.5) * rx, cy + (r() - 0.5) * ry, rx * (0.12 + r() * 0.15), ry * (0.12 + r() * 0.15), i * 2.3, 0.3);
        ctx.fillStyle = `rgba(158,140,66,${0.5 * c.pus})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(120,104,50,${0.35 * c.pus})`;
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Esparadrapo cruzado sobre la gasa
  if (cotton) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = ctx.createPattern(tapePattern(), 'repeat');
    for (const xk of [0.16, 0.84]) {
      const x = px0 + pw * xk;
      ctx.fillRect(x - 34 * s, 0, 68 * s, H);
    }
    ctx.restore();
  }

  // Suciedad, pelusa y decoloración
  if (c.soil > 0.01) {
    ctx.save();
    ctx.globalAlpha = c.soil * (cotton ? 0.75 : 0.45);
    ctx.fillStyle = ctx.createPattern(grimePattern(), 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(132,128,116,${c.soil * (cotton ? 0.4 : 0.16)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.filter = `blur(${5 * s}px)`;
    ctx.strokeStyle = `rgba(92,82,66,${c.soil * 0.6})`;
    ctx.lineWidth = 14 * s;
    ctx.strokeRect(4 * s, 4 * s, W - 8 * s, H - 8 * s);
    ctx.filter = 'none';
    const r = rng(9);
    ctx.strokeStyle = `rgba(110,110,115,${0.25 + c.soil * 0.4})`;
    ctx.lineWidth = 1.2 * s;
    for (let i = 0; i < c.soil * 70; i++) {
      const edge = r() < 0.5;
      const x = edge ? r() * W : (r() < 0.5 ? r() * 30 * s : W - r() * 30 * s);
      const y = edge ? (r() < 0.5 ? r() * 26 * s : H - r() * 26 * s) : r() * H;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (r() - 0.5) * 20 * s, y + (r() - 0.5) * 20 * s, x + (r() - 0.5) * 26 * s, y + (r() - 0.5) * 26 * s);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Fibras sueltas y bordes deshilachados (algodón)
  if (cotton && c.fray > 0.01) {
    const r = rng(21);
    ctx.save();
    ctx.strokeStyle = 'rgba(250,248,240,0.95)';
    ctx.lineWidth = 1.4 * s;
    for (let i = 0; i < c.fray * 140; i++) {
      const side = Math.floor(r() * 4);
      const t = r();
      let x = side < 2 ? px0 - 10 * s + t * (pw + 20 * s) : side === 2 ? px0 - 10 * s : px1 + 10 * s;
      let y = side >= 2 ? py0 - 8 * s + t * (ph + 16 * s) : side === 0 ? py0 - 8 * s : py1 + 8 * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      x += (r() - 0.5) * 34 * s;
      y += (r() - 0.5) * 34 * s;
      ctx.quadraticCurveTo(x + (r() - 0.5) * 18 * s, y + (r() - 0.5) * 18 * s, x, y);
      ctx.stroke();
    }
    // Muescas en el borde exterior (pérdida de integridad)
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < c.fray * 45; i++) {
      const side = Math.floor(r() * 4);
      const t = r();
      const x = side < 2 ? t * W : side === 2 ? 0 : W;
      const y = side >= 2 ? t * H : side === 0 ? 0 : H;
      ctx.beginPath();
      ctx.arc(x, y, (3 + r() * 7 * c.fray) * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
  dr.condTex.needsUpdate = true;

  // Rugosidad: silicona brillante en el borde, almohadilla mate; zonas húmedas brillantes
  const rc = dr.roughCanvas.getContext('2d');
  const rw = dr.roughCanvas.width;
  const rh = dr.roughCanvas.height;
  const k = rw / W;
  rc.save();
  rc.filter = 'none';
  rc.fillStyle = cotton ? 'rgb(236,236,236)' : 'rgb(110,110,110)';
  rc.fillRect(0, 0, rw, rh);
  if (!cotton) {
    rc.fillStyle = 'rgb(200,200,200)';
    roundRectPath(rc, px0 * k, py0 * k, pw * k, ph * k, 28 * s * k);
    rc.fill();
  }
  if (c.stain > 0.005 && c.wet > 0.02) {
    const area = c.stain * pw * ph;
    const a = (pw / ph) * 0.92;
    const rx = Math.sqrt((area * a) / Math.PI) * k;
    const ry = rx / a;
    const v = Math.round((cotton ? 236 : 200) - c.wet * (cotton ? 175 : 110));
    rc.filter = `blur(${3 * s * k + 1}px)`;
    blobPath(rc, (W / 2 + 6 * s) * k, (H / 2 + 2 * s) * k, rx, ry, 1.3);
    rc.fillStyle = `rgb(${v},${v},${v})`;
    rc.fill();
  }
  rc.restore();
  dr.roughTex.needsUpdate = true;
}
