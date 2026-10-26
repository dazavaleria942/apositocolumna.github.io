import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { buildOperatingRoom } from './OperatingRoom.js';
import { TABLE_TOP, BACK_TABLE, AUX_TABLE, INSTRUMENTED_LEVELS } from './layout.js';
import { Patient, bodyTop } from '../models/Patient.js';
import { Spine } from '../models/Spine.js';
import { createScrew, createCap, createRod, createCrossConnector, createDomino, SCREW, ROD_R, CAP } from '../models/Implants.js';
import * as I from '../models/Instruments.js';
import { gauze, gauzeStack, solutionBottle, basin, dressingPack, glove, sterileField, forcepsWithGauze, SurgicalDressing, DRESSING } from '../models/Dressing.js';
import { skinY } from '../models/Patient.js';
import { markerRing, scanPlane, pulseRing, flatArrow, COLORS } from '../models/Effects.js';
import { materials, setHighlight } from '../models/materials.js';
import { enableShadows } from '../utils/geometry.js';
import { ModelRegistry } from '../models/ModelRegistry.js';

const _q = new THREE.Quaternion();

export class World {
  constructor(sm) {
    this.sm = sm;
    this.scene = sm.scene;
    this.registry = new ModelRegistry();
  }

  /** Construcción por etapas (permite mostrar progreso de carga). */
  async build(progress = () => {}) {
    const tick = () => new Promise((r) => requestAnimationFrame(() => r()));
    progress(0.05, 'Preparando quirófano');
    await tick();
    this.room = buildOperatingRoom();
    enableShadows(this.room);
    this.room.children.find((c) => c.name === 'piso').castShadow = false;
    // La lámpara y su brazo no proyectan sombra (la luz principal está en su cara)
    this.room.children.filter((c) => c.userData.noShadow).forEach((c) => c.traverse((o) => (o.castShadow = false)));
    this.scene.add(this.room);

    progress(0.2, 'Modelando paciente');
    await tick();
    this.patient = new Patient();
    this.scene.add(this.patient.group);

    progress(0.45, 'Modelando columna');
    await tick();
    this.spine = new Spine();
    this.hardware = new THREE.Group();
    this.hardware.name = 'vista-anatomica';
    this.hardware.add(this.spine.group);
    this.scene.add(this.hardware);

    progress(0.6, 'Preparando implantes');
    await tick();
    this.buildImplants();

    progress(0.72, 'Preparando instrumental');
    await tick();
    this.buildAnimInstruments();
    this.buildBackTable();

    progress(0.86, 'Preparando material de curación');
    await tick();
    this.buildAuxTable();
    this.buildFx();
    this.dressing = new SurgicalDressing();
    this.scene.add(this.dressing.group);

    this.sm.surfaceGuard = (x, z) => {
      if (x > -0.98 && x < 1.12 && Math.abs(z) < 0.33) return Math.max(bodyTop(x, z), TABLE_TOP + 0.02);
      return -Infinity;
    };

    progress(0.95, 'Cargando modelos externos');
    await this.registry.applyOverrides(this);
    progress(1, 'Listo');
    this.applyState({});
  }

  // ------------------------------------------------------------------ implantes

  buildImplants() {
    const S = this.spine;
    this.slots = [];
    for (const side of [1, -1]) {
      for (const level of INSTRUMENTED_LEVELS) {
        const f = S.frame(level);
        const entry = S.entry(level, side);
        const dir = S.trajectory(level, side);
        const qShank = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
        const tulipOrigin = entry.clone().addScaledVector(dir, -SCREW.ball);
        const seat = tulipOrigin.clone().addScaledVector(f.up, SCREW.seat);
        const screw = createScrew();
        screw.visible = false;
        this.hardware.add(screw);
        const cap = createCap();
        cap.visible = false;
        cap.quaternion.copy(f.quaternion);
        cap.position.copy(seat).addScaledVector(f.up, ROD_R + CAP.h / 2 + 0.0003);
        this.hardware.add(cap);
        const mark = markerRing(0.0078, COLORS.TEAL, 0.0005);
        mark.position.copy(tulipOrigin).addScaledVector(f.up, SCREW.tulipH + 0.0006);
        mark.quaternion.copy(f.quaternion);
        mark.visible = false;
        this.hardware.add(mark);
        this.slots.push({ level, side, f, entry, dir, qShank, tulipOrigin, seat, screw, cap, mark, capPos: cap.position.clone() });
      }
    }
    this.rods = [1, -1].map((side) => this.buildRod(side));
  }

  slot(level, side) {
    return this.slots.find((s) => s.level === level && s.side === side);
  }

  /** Coloca un tornillo: depth 0..L (insertado), spin (rad), settle 0..1 (tulipa alineada). */
  poseScrew(slot, depth = SCREW.length, spin = 0, settle = 1) {
    const { screw, entry, dir, qShank, f } = slot;
    screw.position.copy(entry).addScaledVector(dir, -(SCREW.length - depth));
    const qs = qShank.clone().multiply(_q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), spin));
    screw.userData.shankPivot.quaternion.copy(qs);
    const tulip = screw.userData.tulip;
    tulip.position.copy(dir).multiplyScalar(-SCREW.ball);
    tulip.quaternion.copy(qs).slerp(f.quaternion, settle);
  }

  buildRod(side) {
    const seats = INSTRUMENTED_LEVELS.map((lv) => this.slot(lv, side).seat);
    const ups = INSTRUMENTED_LEVELS.map((lv) => this.slot(lv, side).f.up);
    const x = seats[2].clone().sub(seats[0]).normalize();
    const upAvg = ups[0].clone().add(ups[1]).add(ups[2]).normalize();
    const y = upAvg.clone().addScaledVector(x, -upAvg.dot(x)).normalize();
    const z = new THREE.Vector3().crossVectors(x, y);
    const basis = new THREE.Matrix4().makeBasis(x, y, z);
    const q = new THREE.Quaternion().setFromRotationMatrix(basis);
    const qi = q.clone().invert();
    const toLocal = (p) => p.clone().sub(seats[0]).applyQuaternion(qi);
    const ext = 0.008;
    const pts = [
      toLocal(seats[0].clone().addScaledVector(x, -ext)),
      toLocal(seats[0]),
      toLocal(seats[1]),
      toLocal(seats[2]),
      toLocal(seats[2].clone().addScaledVector(x, ext)),
    ];
    const rod = createRod(pts);
    rod.morphTargetInfluences[0] = 1;
    const pivot = new THREE.Group();
    pivot.name = 'barra-' + (side > 0 ? 'a' : 'b');
    pivot.position.copy(seats[0]);
    pivot.quaternion.copy(q);
    const tilt = new THREE.Group();
    tilt.add(rod);
    pivot.add(tilt);
    pivot.visible = false;
    this.hardware.add(pivot);
    return { side, pivot, tilt, rod, seat0: seats[0].clone(), q, localPts: pts, axis: x, up: y, seats };
  }

  poseRod(r, { proud = 0, offset = null, extraQ = null } = {}) {
    r.pivot.position.copy(r.seat0);
    if (offset) r.pivot.position.add(offset);
    r.pivot.quaternion.copy(r.q);
    if (extraQ) r.pivot.quaternion.premultiply(extraQ);
    r.tilt.rotation.z = proud * 0.065;
  }

  // ------------------------------------------------------------------ instrumental animado

  buildAnimInstruments() {
    const add = (o) => {
      o.visible = false;
      enableShadows(o, true, true);
      this.scene.add(o);
      return o;
    };
    this.tools = {
      probe: add(I.pedicleProbe()),
      feeler: add(I.pedicleFeeler()),
      inserter: add(I.screwInserter()),
      caliper: add(I.rodCaliper()),
      cutter: add(I.rodCutter()),
      bender: add(I.rodBender()),
      rodHolder: add(I.rodHolder()),
      reducer: add(I.rodReducer()),
      capDriver: add(I.capDriver({ withCap: true })),
      torque: add(I.torqueWrench()),
      counter: add(I.counterTorque()),
      forcepsWet: add(forcepsWithGauze()),
      forcepsDry: add(forcepsWithGauze()),
    };
    const wetGauze = this.tools.forcepsWet.userData.gauze;
    wetGauze.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        o.material.color = new THREE.Color('#e7eef3');
        o.material.roughness = 0.4;
      }
    });

    // Barra de trabajo para el corte y doblado (sobre la mesa de instrumental)
    const r = this.rods[0];
    const work = createRod(r.localPts);
    work.morphTargetInfluences[0] = 0;
    const workPivot = new THREE.Group();
    workPivot.name = 'barra-trabajo';
    workPivot.rotation.x = -Math.PI / 2;
    workPivot.position.set(0.075, BACK_TABLE.top + ROD_R + 0.001, -0.765);
    workPivot.add(work);
    const { start, dir, length } = work.userData;
    const excess = new THREE.Mesh(new THREE.CylinderGeometry(ROD_R, ROD_R, 0.032, 18), materials().rod.clone());
    excess.material.transparent = true;
    excess.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    excess.position.copy(start).addScaledVector(dir, length + 0.016 + 0.0004);
    excess.castShadow = true;
    workPivot.add(excess);
    const mark = new THREE.Mesh(new THREE.CylinderGeometry(ROD_R * 1.25, ROD_R * 1.25, 0.0016, 20), new THREE.MeshStandardMaterial({ color: '#1f6fd0', roughness: 0.4 }));
    mark.quaternion.copy(excess.quaternion);
    mark.position.copy(start).addScaledVector(dir, length);
    workPivot.add(mark);
    workPivot.visible = false;
    this.scene.add(workPivot);
    this.workRod = { pivot: workPivot, rod: work, excess, mark, excessHome: excess.position.clone() };
  }

  /** Posición mundial de un punto de la barra de trabajo (t∈[0,1] a lo largo de la barra recta). */
  workRodPoint(t) {
    const { rod, pivot } = this.workRod;
    const { start, dir, length } = rod.userData;
    pivot.updateMatrixWorld(true);
    return pivot.localToWorld(start.clone().addScaledVector(dir, length * t));
  }

  parkTools() {
    Object.values(this.tools).forEach((t) => {
      t.visible = false;
      t.position.set(0, -5, 0);
      t.quaternion.identity();
      t.rotation.set(0, 0, 0);
      t.userData.setOpen?.(0.02);
      t.userData.setSpan?.(0.012);
      t.userData.setPush?.(0);
    });
    if (this.tools.torque.userData.indicator) this.tools.torque.userData.indicator.material.emissiveIntensity = 0;
  }

  // ------------------------------------------------------------------ mesa de instrumental

  buildBackTable() {
    const top = BACK_TABLE.top;
    const zTip = -0.74;
    this.display = {};
    const place = (id, obj, x, { rotZ = 0, z = zTip, flat = true, yaw = 0 } = {}) => {
      const holder = new THREE.Group();
      holder.name = 'display-' + id;
      holder.add(obj);
      if (flat) obj.rotation.set(-Math.PI / 2, 0, rotZ);
      obj.rotation.y = yaw;
      enableShadows(obj);
      this.scene.add(holder);
      holder.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(holder);
      holder.position.set(x - (box.min.x + box.max.x) / 2, top + 0.0012 - box.min.y, z - box.max.z);
      holder.userData.selectable = true;
      holder.userData.infoId = id;
      this.display[id] = holder;
      return holder;
    };

    // 9.1 Pedículo
    place('sonda-pedicular', I.pedicleProbe(), -0.87);
    place('palpador', I.pedicleFeeler(), -0.835);
    place('probador-profundidad', I.depthGauge(), -0.8);
    // 9.2 Tornillos
    place('porta-tornillos', I.screwHolder(), -0.735);
    place('insertador', I.screwInserter(), -0.69);
    // 9.3 Barras
    place('doblador-barras', I.rodBender(), -0.595);
    place('pinza-porta-barras', I.rodHolder(), -0.505);
    place('medidor-barras', I.rodCaliper(), -0.44, { rotZ: Math.PI / 2 });
    // 9.4 Reducción
    place('reductor-barras', I.rodReducer(), -0.37);
    place('pinza-reductora', I.persuader(), -0.3);
    // 9.5 Ajuste final
    place('llave-dinamometrica', I.torqueWrench(), -0.205);
    place('contra-torque', I.counterTorque(), -0.12, { rotZ: 0 });
    place('destornillador-caps', I.capDriver(), -0.045);

    // Bandeja de implantes (9.2, 9.6, 9.7)
    const M = materials();
    const trayX = 0.2;
    const trayZ = -0.96;
    const tray = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.018, 0.27, 3, 0.006), new THREE.MeshPhysicalMaterial({ color: '#dfe5ea', roughness: 0.35, metalness: 0.3, clearcoat: 0.4 }));
    tray.position.set(trayX, top + 0.009, trayZ);
    tray.castShadow = true;
    tray.receiveShadow = true;
    tray.name = 'bandeja-implantes';
    this.scene.add(tray);
    const trayTop = top + 0.018;
    const group = (id, build, x, z) => {
      const holder = new THREE.Group();
      holder.name = 'display-' + id;
      build(holder);
      enableShadows(holder);
      holder.position.set(x, trayTop, z);
      holder.userData.selectable = true;
      holder.userData.infoId = id;
      this.scene.add(holder);
      this.display[id] = holder;
      return holder;
    };
    group('tornillos-pediculares', (h) => {
      for (let i = 0; i < 3; i++) {
        const s = createScrew();
        s.rotation.z = Math.PI / 2;
        s.position.set(-0.025, 0.0075, -0.04 + i * 0.03);
        h.add(s);
      }
    }, trayX - 0.03, trayZ - 0.04);
    group('barras', (h) => {
      for (let i = 0; i < 2; i++) {
        const rod = createRod([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, 0, 0), new THREE.Vector3(0.1, 0, 0), new THREE.Vector3(0.15, 0, 0)]);
        rod.rotation.y = Math.PI / 2;
        rod.position.set(i * 0.012, ROD_R, 0.075);
        h.add(rod);
      }
    }, trayX + 0.06, trayZ);
    group('caps', (h) => {
      for (let i = 0; i < 6; i++) {
        const c = createCap();
        c.position.set((i % 3) * 0.013, CAP.h / 2, Math.floor(i / 3) * 0.013);
        h.add(c);
      }
    }, trayX - 0.06, trayZ + 0.05);
    group('conector-transversal', (h) => {
      const c = createCrossConnector(0.045);
      c.position.y = 0.006;
      h.add(c);
    }, trayX - 0.01, trayZ + 0.1);
    group('conector-longitudinal', (h) => {
      const d = createDomino();
      d.position.y = 0.0045;
      h.add(d);
    }, trayX + 0.03, trayZ + 0.055);
    this.tray = tray;
    this.selectables = Object.values(this.display);
  }

  /** Centro de un conjunto de objetos de la mesa. */
  displayBounds(ids) {
    const box = new THREE.Box3();
    ids.forEach((id) => this.display[id] && box.expandByObject(this.display[id]));
    return box;
  }

  highlightDisplay(ids) {
    const set = new Set(ids);
    Object.entries(this.display).forEach(([id, obj]) => setHighlight(obj, set.has(id), '#2f80ed', 0.16));
  }

  // ------------------------------------------------------------------ mesa auxiliar

  buildAuxTable() {
    const [cx, , cz] = AUX_TABLE.center;
    const top = AUX_TABLE.top;
    const field = sterileField(0.5, 0.34, 0.035);
    field.position.set(cx, top, cz);
    this.scene.add(field);
    const items = new THREE.Group();
    items.name = 'material-curacion';
    const st = gauzeStack(4);
    st.position.set(cx - 0.15, top + 0.002, cz + 0.07);
    const sol = solutionBottle();
    sol.position.set(cx + 0.17, top + 0.002, cz - 0.09);
    const bowl = basin();
    bowl.position.set(cx + 0.06, top + 0.002, cz + 0.08);
    const pack = dressingPack();
    pack.position.set(cx - 0.1, top + 0.002, cz - 0.08);
    pack.rotation.y = 0.08;
    const gl1 = glove(1);
    gl1.position.set(cx + 0.18, top + 0.008, cz + 0.06);
    gl1.rotation.y = -0.3;
    const gl2 = glove(-1);
    gl2.position.set(cx + 0.13, top + 0.014, cz + 0.07);
    gl2.rotation.y = -0.45;
    const forc = I.dressingForceps();
    forc.rotation.set(-Math.PI / 2, 0, 0.1);
    forc.position.set(cx + 0.02, top + 0.004, cz - 0.02);
    const single = gauze();
    single.position.set(cx - 0.02, top + 0.004, cz + 0.1);
    single.rotation.y = 0.3;
    items.add(st, sol, bowl, pack, gl1, gl2, forc, single);
    items.children.forEach((c) => (c.userData.home = c.position.clone()));
    enableShadows(items);
    this.scene.add(items);
    this.aux = {
      field,
      items,
      parts: { gauze: st, solution: sol, basin: bowl, pack, gloves: [gl1, gl2], forceps: forc, single },
    };
    enableShadows(field, false, true);
  }

  // ------------------------------------------------------------------ efectos

  buildFx() {
    const S = this.spine;
    this.fx = {};
    this.fx.entryMarkers = this.slots.map((s) => {
      const m = markerRing(0.0042, COLORS.BLUE);
      m.position.copy(s.entry).addScaledVector(s.f.up, 0.0006);
      m.quaternion.copy(s.f.quaternion);
      m.visible = false;
      this.hardware.add(m);
      return m;
    });
    // Zona de los niveles instrumentados (volumen translúcido con aristas)
    const f3 = S.frame('L3');
    const f5 = S.frame('L5');
    const xa = f3.origin.x - S.levels.L3.h / 2 - 0.005;
    const xb = f5.origin.x + S.levels.L5.h / 2 + 0.005;
    const y0 = Math.min(f3.origin.y, f5.origin.y) - 0.022;
    const y1 = Math.max(f3.origin.y, f5.origin.y) + 0.06;
    const zoneGeo = new THREE.BoxGeometry(xb - xa, y1 - y0, 0.096);
    const zone = new THREE.Group();
    zone.position.set((xa + xb) / 2, (y0 + y1) / 2, 0);
    const fill = new THREE.Mesh(zoneGeo, new THREE.MeshBasicMaterial({ color: COLORS.BLUE, transparent: true, opacity: 0.07, depthWrite: false, toneMapped: false }));
    fill.userData.noAO = true;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(zoneGeo), new THREE.LineBasicMaterial({ color: COLORS.BLUE, transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false }));
    fill.renderOrder = 18;
    edges.renderOrder = 19;
    zone.add(fill, edges);
    zone.visible = false;
    this.fx.bracket = zone;
    this.fx.bracketAnchor = new THREE.Vector3((xa + xb) / 2, y1, 0.048);
    this.hardware.add(zone);

    this.fx.scan = scanPlane(0.15, 0.1);
    this.fx.scan.visible = false;
    this.scene.add(this.fx.scan);

    this.fx.pulses = [];
    for (let i = 0; i < 8; i++) {
      const p = pulseRing(0.012);
      p.visible = false;
      this.scene.add(p);
      this.fx.pulses.push(p);
    }

    this.fx.arrows = [1, -1].map((side) => {
      const a = flatArrow(0.032, 0.008, COLORS.TEAL);
      a.visible = false;
      a.userData.side = side;
      this.scene.add(a);
      return a;
    });

    this.fx.reviewMarkers = [];
    for (let i = 0; i < 4; i++) {
      const m = markerRing(0.0065, COLORS.TEAL, 0.0006);
      m.visible = false;
      this.scene.add(m);
      this.fx.reviewMarkers.push(m);
    }

    this.fx.temp = new THREE.Group();
    this.fx.temp.name = 'fx-temporales';
    this.scene.add(this.fx.temp);
  }

  clearTempFx() {
    const t = this.fx.temp;
    while (t.children.length) {
      const c = t.children.pop();
      c.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
    }
  }

  // ------------------------------------------------------------------ seguimiento posquirúrgico

  /** Estado del apósito y de la piel perilesional para un día (cond) o ninguno (null). */
  setFollowUp(material, cond) {
    this.dressing.setCondition(material, cond);
    // Exposición algo menor en los primeros planos del apósito: conserva el detalle de los blancos
    this.sm.renderer.toneMappingExposure = cond ? 0.86 : 1;
    this.patient.setPeriwound(cond, { cx: DRESSING.cx, lx: DRESSING.lx, lz: DRESSING.lz });
  }

  /** Punto del apósito en el mundo (fracciones -0.5..0.5 del largo y del ancho). */
  dressingPoint(fx = 0, fz = 0, lift = 0.004) {
    const x = DRESSING.cx + fx * DRESSING.lx;
    const z = fz * DRESSING.lz;
    return new THREE.Vector3(x, skinY(x, z) + lift, z);
  }

  /**
   * Miniatura del apósito renderizada con el mismo motor 3D (JPEG en data URL).
   * Se dibuja en una esquina del lienzo y se copia de inmediato; se llama antes del
   * render principal del mismo cuadro, que vuelve a pintar el lienzo completo.
   */
  renderThumbnail(material, cond, w = 480, h = 300) {
    const r = this.sm.renderer;
    const size = r.getSize(new THREE.Vector2());
    const pr = r.getPixelRatio();
    // Se dibuja en píxeles físicos w×h (en la esquina del lienzo) y se copia
    const k = Math.min(1, (size.x * pr) / w, (size.y * pr) / h);
    const pw = Math.max(1, Math.floor(w * k));
    const ph = Math.max(1, Math.floor(h * k));
    const prev = { m: this.dressing.material, c: this.dressing.cond };
    this.setFollowUp(material, cond);
    if (!this.thumbCam) this.thumbCam = new THREE.PerspectiveCamera(30, 1, 0.01, 10);
    const cam = this.thumbCam;
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    const t = this.dressingPoint(0, -0.04, 0);
    const az = 0.2;
    const el = 1.2;
    const d = 0.355;
    cam.position.set(t.x + Math.sin(az) * Math.cos(el) * d, t.y + Math.sin(el) * d, t.z + Math.cos(az) * Math.cos(el) * d);
    cam.lookAt(t);
    r.setScissorTest(true);
    r.setViewport(0, 0, pw / pr, ph / pr);
    r.setScissor(0, 0, pw / pr, ph / pr);
    r.render(this.scene, cam);
    const out = document.createElement('canvas');
    out.width = pw;
    out.height = ph;
    out.getContext('2d').drawImage(r.domElement, 0, r.domElement.height - ph, pw, ph, 0, 0, pw, ph);
    r.setScissorTest(false);
    r.setViewport(0, 0, size.x, size.y);
    this.setFollowUp(prev.c ? prev.m : null, prev.c);
    return out.toDataURL('image/jpeg', 0.82);
  }

  /** Transición de la vista anatómica (0 = piel opaca, 1 = translúcida). */
  setXray(t) {
    this.patient.setXray(t);
    this.hardware.visible = t > 0.01;
  }

  // ------------------------------------------------------------------ estado absoluto de la escena

  /**
   * Aplica un estado completo e idempotente. Cada paso declara el estado en el que comienza.
   */
  applyState(partial) {
    const s = {
      xray: 0,
      antiseptic: false,
      incision: true,
      assembly: 0,
      workRod: 'none',
      dressing: 'none',
      wet: false,
      auxField: true,
      auxItems: true,
      torqueMarks: false,
      highlight: [],
      ...partial,
    };
    this.state = s;
    this.parkTools();
    this.clearTempFx();
    Object.values(this.fx).forEach((v) => {
      if (Array.isArray(v)) v.forEach((o) => o.isObject3D && (o.visible = false));
    });
    this.fx.bracket.visible = false;
    this.fx.scan.visible = false;

    const P = this.patient;
    this.setXray(s.xray);
    P.setIncisionVisible(s.incision);
    P.setAntiseptic(s.antiseptic);
    P.clearWet();
    if (s.wet) P.wetStrips();

    const showHardware = true;
    this.hardware.visible = s.xray > 0.01;

    const a = s.assembly;
    this.slots.forEach((slot) => {
      slot.screw.visible = showHardware && a >= 1;
      if (a >= 1) this.poseScrew(slot, SCREW.length, 0, 1);
      slot.cap.visible = showHardware && a >= 6;
      slot.cap.position.copy(slot.capPos);
      slot.cap.quaternion.copy(slot.f.quaternion);
      slot.mark.visible = showHardware && s.torqueMarks && a >= 7;
    });
    this.rods.forEach((r) => {
      r.pivot.visible = showHardware && a >= 4;
      r.rod.morphTargetInfluences[0] = 1;
      this.poseRod(r, { proud: a === 4 ? 1 : 0 });
    });

    const W = this.workRod;
    W.pivot.visible = s.workRod !== 'none';
    W.rod.morphTargetInfluences[0] = s.workRod === 'bent' ? 1 : 0;
    W.excess.visible = s.workRod === 'long';
    W.excess.position.copy(W.excessHome);
    W.excess.material.opacity = 1;
    W.mark.visible = s.workRod === 'long';

    this.dressing.group.visible = s.dressing !== 'none';
    this.dressing.group.position.set(this.dressing.group.position.x, 0, 0);
    this.dressing.group.rotation.set(0, 0, 0);
    if (s.dressing === 'placed') this.dressing.set({ conform: 1, lift: 1, seal: 0 });
    if (s.dressing === 'fixed') this.dressing.set({ conform: 1, lift: 0, seal: 1 });
    if (s.followUp) this.setFollowUp(s.followUp.material, s.followUp.cond);
    else this.setFollowUp(null, null);

    this.aux.field.visible = s.auxField;
    this.aux.field.scale.set(1, 1, 1);
    this.aux.items.visible = s.auxItems;
    this.aux.items.children.forEach((c) => {
      c.visible = true;
      c.position.copy(c.userData.home);
    });
    this.highlightDisplay(s.highlight);
  }
}
