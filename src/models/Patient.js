import * as THREE from 'three';
import { TABLE_TOP, WINDOW, INCISION, TABLE } from '../scenes/layout.js';
import { makeProfile, smoothstep, clamp, lerp } from '../utils/math.js';
import { sweepGeometry, conformGrid, mesh } from '../utils/geometry.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from './materials.js';
import { drapeColorMap, incisionTexture, paintLayer } from '../utils/textures.js';

// ---------------------------------------------------------------------------
// Anatomía de superficie (analítica). El mismo modelo se usa para generar la
// malla del torso y para adaptar el campo, el apósito y las capas sobre la piel.
// ---------------------------------------------------------------------------

const N_EXP = 2.5; // superelipse: espalda más plana que una elipse
export const WET_COLOR = 'rgba(255,246,240,ALPHA)';

const torsoW = makeProfile([
  [-0.72, 0.05], [-0.66, 0.056], [-0.6, 0.068], [-0.55, 0.15], [-0.49, 0.205], [-0.4, 0.196],
  [-0.28, 0.178], [-0.16, 0.162], [-0.05, 0.148], [0.05, 0.152], [0.14, 0.17], [0.24, 0.182],
  [0.33, 0.175], [0.42, 0.16],
]);
const torsoT = makeProfile([
  [-0.72, 0.042], [-0.66, 0.045], [-0.6, 0.05], [-0.55, 0.076], [-0.49, 0.1], [-0.4, 0.113],
  [-0.28, 0.116], [-0.16, 0.108], [-0.05, 0.098], [0.05, 0.097], [0.14, 0.105], [0.24, 0.118],
  [0.33, 0.11], [0.42, 0.095],
]);
const neckLift = makeProfile([[-0.72, 0.07], [-0.66, 0.056], [-0.6, 0.036], [-0.55, 0.012], [-0.49, 0], [0.4, 0]]);
const groove = makeProfile([[-0.55, 0], [-0.45, 0.002], [-0.3, 0.0038], [-0.1, 0.0045], [0.1, 0.004], [0.2, 0.0018], [0.3, 0]]);
const GROOVE_SIGMA = 0.014;

const legW = makeProfile([[0.3, 0.09], [0.45, 0.085], [0.6, 0.07], [0.72, 0.055], [0.85, 0.05], [0.98, 0.038], [1.05, 0.036]]);
const legT = makeProfile([[0.3, 0.09], [0.45, 0.08], [0.6, 0.068], [0.72, 0.055], [0.85, 0.055], [0.98, 0.042], [1.05, 0.04]]);
const legLift = makeProfile([[0.7, 0], [0.82, 0.025], [0.93, 0.055], [1.05, 0.06]]);
const LEG_Z = 0.088;

export const TORSO_X0 = -0.72;
export const TORSO_X1 = 0.42;

export function torsoSection(x) {
  const w = torsoW(x);
  const t = torsoT(x);
  const yc = TABLE_TOP + t + neckLift(x);
  return { w, t, yc };
}

function superTop(dz, w, t) {
  const a = Math.abs(dz / w);
  if (a >= 1) return -Infinity;
  return t * Math.pow(1 - Math.pow(a, N_EXP), 1 / N_EXP);
}

/** Altura de la piel (cara posterior) del torso. */
export function torsoTop(x, z) {
  if (x < TORSO_X0 || x > TORSO_X1) return -Infinity;
  const { w, t, yc } = torsoSection(x);
  const top = superTop(z, w, t);
  if (top === -Infinity) return -Infinity;
  const k = Math.pow(clamp(top / t, 0, 1), 4);
  return yc + top - groove(x) * Math.exp(-(z * z) / (GROOVE_SIGMA * GROOVE_SIGMA)) * k;
}

function legTop(x, z) {
  if (x < 0.3 || x > 1.06) return -Infinity;
  let best = -Infinity;
  for (const zc of [-LEG_Z, LEG_Z]) {
    const w = legW(x);
    const t = legT(x);
    const top = superTop(z - zc, w, t);
    if (top === -Infinity) continue;
    best = Math.max(best, TABLE_TOP + t + legLift(x) + top);
  }
  return best;
}

export function bodyTop(x, z) {
  return Math.max(torsoTop(x, z), legTop(x, z));
}

/** Piel en la zona quirúrgica (sin −∞, para capas y apósito). */
export function skinY(x, z) {
  const y = torsoTop(x, z);
  return Number.isFinite(y) ? y : TABLE_TOP;
}

// ---------------------------------------------------------------------------

function buildTorsoGeometry(nx = 150, nr = 112) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= nx; i++) {
    const x = TORSO_X0 + (TORSO_X1 - TORSO_X0) * (i / nx);
    const { w, t, yc } = torsoSection(x);
    const g = groove(x);
    for (let j = 0; j <= nr; j++) {
      const a = (j / nr) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const pz = w * Math.sign(c) * Math.pow(Math.abs(c), 2 / N_EXP);
      let py = t * Math.sign(s) * Math.pow(Math.abs(s), 2 / N_EXP);
      if (py > 0) {
        const k = Math.pow(py / t, 4);
        py -= g * Math.exp(-(pz * pz) / (GROOVE_SIGMA * GROOVE_SIGMA)) * k;
      }
      positions.push(x, yc + py, pz);
      uvs.push(i / nx, j / nr);
    }
  }
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nr; j++) {
      const a = i * (nr + 1) + j;
      const b = (i + 1) * (nr + 1) + j;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildGownGeometry(x0 = -0.645, x1 = -0.3, nx = 60, nr = 80) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= nx; i++) {
    const x = x0 + (x1 - x0) * (i / nx);
    const { w, t, yc } = torsoSection(x);
    const inflate = 0.009 + 0.004 * Math.sin((i / nx) * Math.PI);
    for (let j = 0; j <= nr; j++) {
      const a = (j / nr) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const wobble = 0.0025 * Math.sin(a * 9 + x * 40) * (s > 0 ? 1 : 0.3);
      const pz = (w + inflate + wobble) * Math.sign(c) * Math.pow(Math.abs(c), 2 / N_EXP);
      const py = (t + inflate + wobble) * Math.sign(s) * Math.pow(Math.abs(s), 2 / N_EXP);
      positions.push(x, yc + py, pz);
      uvs.push((i / nx) * 0.4, j / nr);
    }
  }
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nr; j++) {
      const a = i * (nr + 1) + j;
      const b = (i + 1) * (nr + 1) + j;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ---------------------------------------------------------------------------
// Campo quirúrgico: altura del campo con "tensión" de tela y caída lateral.
// ---------------------------------------------------------------------------

const DRAPE = { U0: -0.42, U1: 1.3, XF: 1.08, E: 0.277, S: 0.8, R: 0.02 };

function buildDrapeHeightField() {
  const x0 = DRAPE.U0 - 0.02;
  const x1 = DRAPE.XF + 0.01;
  const z0 = -DRAPE.E - 0.01;
  const z1 = DRAPE.E + 0.01;
  const step = 0.005;
  const nx = Math.ceil((x1 - x0) / step) + 1;
  const nz = Math.ceil((z1 - z0) / step) + 1;
  const raw = new Float32Array(nx * nz);
  const minSkin = new Float32Array(nx * nz);
  const base = TABLE_TOP + 0.004;
  for (let i = 0; i < nx; i++) {
    const x = x0 + i * step;
    for (let k = 0; k < nz; k++) {
      const z = z0 + k * step;
      const dWin = Math.max(WINDOW.x0 - x, x - WINDOW.x1, WINDOW.z0 - z, z - WINDOW.z1, 0);
      const clearance = lerp(0.0012, 0.007, smoothstep(0.02, 0.06, dWin));
      const b = bodyTop(x, z);
      raw[i * nz + k] = Math.max(base, b + clearance);
      minSkin[i * nz + k] = Math.max(base, b + 0.0012);
    }
  }
  // Tensión: la tela no entra en concavidades profundas.
  const slope = 1.15;
  const rad = 12;
  const H = new Float32Array(raw);
  const offsets = [];
  for (let a = -rad; a <= rad; a++) {
    for (let b = -rad; b <= rad; b++) {
      const d = Math.hypot(a, b);
      if (d > 0 && d <= rad) offsets.push([a, b, d * step * slope]);
    }
  }
  for (let i = 0; i < nx; i++) {
    for (let k = 0; k < nz; k++) {
      let m = raw[i * nz + k];
      for (const [a, b, drop] of offsets) {
        const ii = i + a;
        const kk = k + b;
        if (ii < 0 || kk < 0 || ii >= nx || kk >= nz) continue;
        const v = raw[ii * nz + kk] - drop;
        if (v > m) m = v;
      }
      H[i * nz + k] = m;
    }
  }
  // Suavizado
  let cur = H;
  for (let pass = 0; pass < 3; pass++) {
    const nxt = new Float32Array(cur.length);
    for (let i = 0; i < nx; i++) {
      for (let k = 0; k < nz; k++) {
        let s = 0;
        let c = 0;
        for (let a = -1; a <= 1; a++) {
          for (let b = -1; b <= 1; b++) {
            const ii = clamp(i + a, 0, nx - 1);
            const kk = clamp(k + b, 0, nz - 1);
            s += cur[ii * nz + kk];
            c++;
          }
        }
        nxt[i * nz + k] = Math.max(s / c, minSkin[i * nz + k]);
      }
    }
    cur = nxt;
  }
  return function sample(x, z) {
    const fx = clamp((x - x0) / step, 0, nx - 1.001);
    const fz = clamp((z - z0) / step, 0, nz - 1.001);
    const i = Math.floor(fx);
    const k = Math.floor(fz);
    const tx = fx - i;
    const tz = fz - k;
    const a = cur[i * nz + k];
    const b = cur[(i + 1) * nz + k];
    const c = cur[i * nz + k + 1];
    const d = cur[(i + 1) * nz + k + 1];
    return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
  };
}

function axisSamples(segments) {
  const out = [];
  segments.forEach(([a, b, step], idx) => {
    const n = Math.max(1, Math.round((b - a) / step));
    for (let i = idx === 0 ? 0 : 1; i <= n; i++) out.push(a + (b - a) * (i / n));
  });
  return out;
}

function buildDrape() {
  const { U0, U1, XF, E, S, R } = DRAPE;
  const H = buildDrapeHeightField();
  const xs = axisSamples([
    [U0, WINDOW.x0, 0.012],
    [WINDOW.x0, WINDOW.x1, 0.005],
    [WINDOW.x1, XF, 0.012],
    [XF, U1, 0.012],
  ]);
  const ss = axisSamples([
    [-S, -E, 0.012],
    [-E, WINDOW.z0, 0.006],
    [WINDOW.z0, WINDOW.z1, 0.005],
    [WINDOW.z1, E, 0.006],
    [E, S, 0.012],
  ]);
  const positions = [];
  const uvs = [];
  const nI = xs.length;
  const nK = ss.length;
  for (let i = 0; i < nI; i++) {
    const u = xs[i];
    for (let k = 0; k < nK; k++) {
      const s = ss[k];
      const px = Math.min(u, XF);
      const pz = clamp(s, -E, E);
      const hz = Math.max(Math.abs(s) - E, 0);
      const hx = Math.max(u - XF, 0);
      let x = px;
      let z = pz;
      let y = H(px, pz);
      // Ondulación sutil sobre el cuerpo
      y += 0.0009 * Math.sin(u * 47 + s * 13) * Math.sin(s * 31 - u * 7) * smoothstep(0.03, 0.09, Math.max(WINDOW.x0 - u, u - WINDOW.x1, WINDOW.z0 - s, s - WINDOW.z1, 0));
      const hang = Math.hypot(hz, hx);
      if (hang > 0) {
        const dx = hx / hang;
        const dz = (Math.sign(s) * hz) / hang;
        let out;
        let drop;
        const arc = (Math.PI * R) / 2;
        if (hang < arc) {
          const ang = hang / R;
          out = R * Math.sin(ang);
          drop = R * (1 - Math.cos(ang));
        } else {
          const extra = hang - arc;
          const folds = 0.013 * smoothstep(0, 0.18, extra);
          const wav = hz > hx ? Math.sin(u * 34 + Math.sin(u * 9) * 1.5) : Math.sin(s * 34);
          out = R + folds * (0.6 + 0.4 * wav) + extra * 0.04;
          drop = R + extra;
        }
        x += dx * out;
        z += dz * out;
        y -= drop;
      }
      positions.push(x, y, z);
      uvs.push((u - U0) / (U1 - U0), (s + S) / (2 * S));
    }
  }
  const indices = [];
  for (let i = 0; i < nI - 1; i++) {
    for (let k = 0; k < nK - 1; k++) {
      const cx = (xs[i] + xs[i + 1]) / 2;
      const cz = (ss[k] + ss[k + 1]) / 2;
      if (cx > WINDOW.x0 && cx < WINDOW.x1 && cz > WINDOW.z0 && cz < WINDOW.z1) continue;
      const a = i * nK + k;
      const b = (i + 1) * nK + k;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = materials().drape.clone();
  mat.map = drapeColorMap({
    uFn: (x) => (x - U0) / (U1 - U0),
    vFn: (z) => 1 - (z + S) / (2 * S),
    window: WINDOW,
  });
  mat.bumpMap = materials().drape.bumpMap.clone();
  mat.bumpMap.repeat.set(40, 36);
  mat.bumpMap.needsUpdate = true;
  const m = mesh(geo, mat, 'campo-quirurgico');
  return { mesh: m, height: H };
}

// ---------------------------------------------------------------------------

export class Patient {
  constructor() {
    const M = materials();
    this.group = new THREE.Group();
    this.group.name = 'paciente';

    // Torso (piel) con material propio para la vista anatómica translúcida
    this.skinMat = M.skin.clone();
    const torsoGeo = buildTorsoGeometry();
    this.torso = mesh(torsoGeo, this.skinMat, 'torso');
    this.group.add(this.torso);
    // Volumen "fantasma" para la vista anatómica (cara interna, tono neutro)
    this.ghostMat = new THREE.MeshBasicMaterial({ color: '#71879c', transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false });
    this.ghost = new THREE.Mesh(torsoGeo, this.ghostMat);
    this.ghost.visible = false;
    this.ghost.userData.noAO = true;
    this.ghost.renderOrder = -1;
    this.group.add(this.ghost);

    // Cabeza y gorro
    const headGeo = new THREE.SphereGeometry(1, 48, 32);
    const head = mesh(headGeo, M.skin, 'cabeza');
    head.scale.set(0.098, 0.083, 0.076);
    head.position.set(-0.775, TABLE_TOP + 0.115, 0);
    this.group.add(head);

    const capGeo = new THREE.SphereGeometry(1, 56, 32, 0, Math.PI * 2, 0, Math.PI * 0.64);
    const cap = mesh(capGeo, M.cap, 'gorro');
    cap.scale.set(0.105, 0.09, 0.083);
    cap.position.copy(head.position);
    cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-0.62, 0.78, 0).normalize());
    this.group.add(cap);

    // Bata (parte superior visible fuera del campo)
    this.gown = mesh(buildGownGeometry(), M.gown, 'bata');
    this.group.add(this.gown);

    // Brazos en posición prona (abducción con codos flexionados) sobre apoyabrazos.
    // Mangas largas de la bata y compresa sobre las manos.
    for (const side of [-1, 1]) {
      const S = new THREE.Vector3(-0.47, TABLE_TOP + 0.108, side * 0.15);
      const Eb = new THREE.Vector3(-0.49, TABLE_TOP + 0.04, side * 0.45);
      const W = new THREE.Vector3(-0.74, TABLE_TOP + 0.032, side * 0.465);
      const armCurve = new THREE.CatmullRomCurve3([
        S,
        S.clone().lerp(Eb, 0.5).add(new THREE.Vector3(0, 0.012, 0)),
        Eb.clone().add(new THREE.Vector3(0.006, 0, side * 0.008)),
        Eb.clone().lerp(W, 0.5),
        W,
      ], false, 'centripetal');
      const sleeve = mesh(sweepGeometry(armCurve, {
        segments: 60,
        radial: 28,
        radius: (t) => lerp(0.06, 0.038, t) + 0.0025 * Math.sin(t * 38) * (1 - t * 0.5),
      }), M.gown, 'manga');
      this.group.add(sleeve);
      const towel = mesh(new RoundedBoxGeometry(0.16, 0.05, 0.12, 4, 0.02), M.blanket, 'compresa-manos');
      towel.position.set(-0.77, TABLE_TOP + 0.03, side * 0.468);
      towel.rotation.y = side * 0.05;
      this.group.add(towel);
    }

    // Campo quirúrgico con ventana
    const drape = buildDrape();
    this.drape = drape.mesh;
    this.drapeHeight = drape.height;
    this.group.add(this.drape);

    // Capas sobre la piel dentro de la ventana
    const win = { x0: WINDOW.x0 - 0.004, x1: WINDOW.x1 + 0.004, z0: WINDOW.z0 - 0.004, z1: WINDOW.z1 + 0.004 };
    this.antiseptic = paintLayer({ ...win, w: 512, h: 256 });
    const antiGrid = conformGrid({ ...win, nx: 90, nz: 40, heightFn: skinY, offset: 0.00045 });
    this.antisepticMat = new THREE.MeshStandardMaterial({
      map: this.antiseptic.texture,
      transparent: true,
      roughness: 0.42,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    this.antisepticMesh = new THREE.Mesh(antiGrid.geometry, this.antisepticMat);
    this.antisepticMesh.renderOrder = 2;
    this.antisepticMesh.userData.noAO = true;
    this.group.add(this.antisepticMesh);

    this.wet = paintLayer({ ...win, w: 512, h: 256 });
    const wetGrid = conformGrid({ ...win, nx: 90, nz: 40, heightFn: skinY, offset: 0.0007 });
    this.wetMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      map: this.wet.texture,
      transparent: true,
      opacity: 0.3,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
    });
    this.wetMesh = new THREE.Mesh(wetGrid.geometry, this.wetMat);
    this.wetMesh.renderOrder = 3;
    this.wetMesh.userData.noAO = true;
    this.group.add(this.wetMesh);

    // Piel perilesional (maceración, enrojecimiento) para el seguimiento posquirúrgico
    this.peri = paintLayer({ ...win, w: 512, h: 256 });
    const periGrid = conformGrid({ ...win, nx: 90, nz: 40, heightFn: skinY, offset: 0.0006 });
    this.periMat = new THREE.MeshStandardMaterial({
      map: this.peri.texture,
      transparent: true,
      roughness: 0.55,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    this.periMesh = new THREE.Mesh(periGrid.geometry, this.periMat);
    this.periMesh.renderOrder = 2;
    this.periMesh.userData.noAO = true;
    this.periMesh.visible = false;
    this.group.add(this.periMesh);

    // Incisión cerrada con grapas (representación médica, no gráfica)
    this.incision = new THREE.Group();
    this.incision.name = 'incision';
    const incGrid = conformGrid({ x0: INCISION.x0 - 0.008, x1: INCISION.x1 + 0.008, z0: -0.0065, z1: 0.0065, nx: 120, nz: 4, heightFn: skinY, offset: 0.0009 });
    this.incisionMat = new THREE.MeshStandardMaterial({
      map: incisionTexture(),
      transparent: true,
      roughness: 0.5,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    });
    const incMesh = new THREE.Mesh(incGrid.geometry, this.incisionMat);
    incMesh.renderOrder = 4;
    incMesh.userData.noAO = true;
    this.incision.add(incMesh);
    const stapleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.0008, -0.0042),
      new THREE.Vector3(0, 0.0007, -0.004),
      new THREE.Vector3(0, 0.0011, 0),
      new THREE.Vector3(0, 0.0007, 0.004),
      new THREE.Vector3(0, -0.0008, 0.0042),
    ]);
    const stapleGeo = sweepGeometry(stapleCurve, { segments: 16, radial: 6, radius: 0.00032, up: new THREE.Vector3(1, 0, 0) });
    this.staples = [];
    for (let x = INCISION.x0 + 0.006; x <= INCISION.x1 - 0.004; x += 0.0115) {
      const st = new THREE.Mesh(stapleGeo, M.steel);
      st.position.set(x, skinY(x, 0), 0);
      st.castShadow = true;
      this.incision.add(st);
      this.staples.push(st);
    }
    this.group.add(this.incision);

    this.xray = 0;
  }

  /** 0 = piel opaca, 1 = vista anatómica translúcida. */
  setXray(t) {
    this.xray = t;
    const m = this.skinMat;
    const op = 1 - 0.74 * t;
    this.ghost.visible = t > 0.01;
    this.ghostMat.opacity = 0.5 * t;
    m.opacity = op;
    const transparent = t > 0.001;
    if (m.transparent !== transparent) {
      m.transparent = transparent;
      m.needsUpdate = true;
    }
    m.depthWrite = t < 0.4;
    this.torso.castShadow = t < 0.5;
    this.torso.userData.noAO = t > 0.3;
    this.antisepticMat.opacity = 1 - t;
    if (this.periMat) this.periMat.opacity = 1 - t;
    this.wetMat.opacity = 0.3 * (1 - t);
    this.incisionMat.opacity = 1 - t;
    this.staples.forEach((s) => (s.visible = t < 0.6));
  }

  setIncisionVisible(v) {
    this.incision.visible = v;
  }

  /** Antiséptico aplicado completo (estado) o vacío. */
  setAntiseptic(full) {
    this.antiseptic.clear();
    if (full) this.paintAntisepticDisc(1);
  }

  /** Pinta el antiséptico desde el centro hacia la periferia (progreso 0–1). */
  paintAntisepticDisc(progress) {
    const cx = (INCISION.x0 + INCISION.x1) / 2;
    const maxR = 0.2;
    const r = maxR * progress;
    const L = this.antiseptic;
    L.ctx.save();
    L.ctx.globalCompositeOperation = 'source-over';
    const W = L.canvas.width;
    const Hh = L.canvas.height;
    const sx = W / (WINDOW.x1 - WINDOW.x0 + 0.008);
    const pcx = (cx - (WINDOW.x0 - 0.004)) * sx;
    const pcy = Hh / 2;
    const g = L.ctx.createRadialGradient(pcx, pcy, 0, pcx, pcy, Math.max(1, r * sx));
    g.addColorStop(0, 'rgba(168, 104, 48, 0.3)');
    g.addColorStop(0.85, 'rgba(168, 104, 48, 0.27)');
    g.addColorStop(1, 'rgba(168, 104, 48, 0)');
    L.ctx.fillStyle = g;
    L.ctx.beginPath();
    L.ctx.ellipse(pcx, pcy, r * sx, r * sx, 0, 0, Math.PI * 2);
    L.ctx.fill();
    L.ctx.restore();
    L.texture.needsUpdate = true;
  }

  clearWet() {
    this.wet.clear();
  }

  /**
   * Piel alrededor del apósito: maceración (blanquecina por humedad) y
   * enrojecimiento (signo de alarma). rect: { cx, lx, lz } del apósito.
   */
  setPeriwound(c, rect) {
    const L = this.peri;
    L.clear();
    if (!c || (c.macer < 0.01 && c.redness < 0.01)) {
      this.periMesh.visible = false;
      return;
    }
    this.periMesh.visible = true;
    const ctx = L.ctx;
    const [x0, z0] = L.toPx(rect.cx - rect.lx / 2, -rect.lz / 2);
    const [x1, z1] = L.toPx(rect.cx + rect.lx / 2, rect.lz / 2);
    const s = L.scale;
    ctx.save();
    if (c.redness > 0.01) {
      const cx = (x0 + x1) / 2;
      const cy = (z0 + z1) / 2;
      // El halo se mantiene dentro de la capa para no dejar un corte recto en su borde
      const rx = Math.min((x1 - x0) / 2 + 0.035 * s, cx - 1, L.canvas.width - cx - 1);
      const ry = Math.min((z1 - z0) / 2 + 0.03 * s, cy - 1, L.canvas.height - cy - 1);
      ctx.translate(cx, cy);
      ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, rx * 0.55, 0, 0, rx);
      g.addColorStop(0, `rgba(196,70,60,${0.5 * c.redness})`);
      g.addColorStop(0.7, `rgba(205,85,72,${0.32 * c.redness})`);
      g.addColorStop(1, 'rgba(205,85,72,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    if (c.macer > 0.01) {
      // Banda blanquecina de pocos milímetros junto al borde del apósito
      const band = (0.0015 + 0.0035 * c.macer) * s;
      ctx.filter = `blur(${Math.max(1, band * 0.4)}px)`;
      ctx.strokeStyle = `rgba(236,226,214,${0.55 * c.macer})`;
      ctx.lineWidth = band * 2;
      ctx.beginPath();
      ctx.roundRect(x0, z0, x1 - x0, z1 - z0, 6);
      ctx.stroke();
      ctx.filter = 'none';
      ctx.strokeStyle = `rgba(225,215,205,${0.5 * c.macer})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 40; i++) {
        const t = i / 40;
        const x = x0 + (x1 - x0) * t;
        ctx.beginPath();
        ctx.moveTo(x, z0 - band);
        ctx.lineTo(x + 3, z0 + band * 0.4);
        ctx.moveTo(x, z1 + band);
        ctx.lineTo(x + 3, z1 - band * 0.4);
        ctx.stroke();
      }
    }
    // Bajo el apósito la capa queda vacía (evita que se vea a través del borde fino)
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    const inset = 0.002 * s;
    ctx.beginPath();
    ctx.roundRect(x0 + inset, z0 + inset, x1 - x0 - inset * 2, z1 - z0 - inset * 2, 4);
    ctx.fill();
    ctx.restore();
    L.texture.needsUpdate = true;
  }

  /** Piel húmeda tras la limpieza: franjas paralelas a la incisión. */
  wetStrips() {
    this.wet.clear();
    for (const z of [0, 0.017, 0.034, -0.017, -0.034]) {
      for (let x = INCISION.x0 - 0.008; x <= INCISION.x1 + 0.008; x += 0.004) this.wet.dab(x, z, 0.0085, WET_COLOR, 1);
    }
  }
}
