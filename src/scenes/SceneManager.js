import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { gsap } from 'gsap';
import { backgroundTexture } from '../utils/textures.js';
import { TABLE_TOP } from './layout.js';

/** GTAO que ignora superficies translúcidas (piel en vista anatómica, capas). */
class SelectiveGTAOPass extends GTAOPass {
  overrideVisibility() {
    super.overrideVisibility();
    this.scene.traverse((o) => {
      if (o.isMesh && o.visible && (o.userData.noAO || (o.material && o.material.transparent && o.material.opacity < 0.7))) {
        o.visible = false;
      }
    });
  }
}

export class SceneManager {
  constructor(container) {
    this.container = container;
    this.updaters = new Set();
    this.surfaceGuard = null; // función (x, z) => altura mínima de la cámara
    this.quality = 'high';

    // Equipos táctiles / pantallas pequeñas: menos píxeles, sombras más livianas
    this.isMobile = window.matchMedia?.('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 600;
    this.maxDpr = this.isMobile ? 1.5 : 2;
    this.baseFov = 38;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxDpr));
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', 'Vista 3D del procedimiento');
    renderer.domElement.setAttribute('role', 'img');
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = backgroundTexture();
    scene.fog = new THREE.Fog('#d9e1e8', 3.5, 9);
    this.scene = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;

    const camera = new THREE.PerspectiveCamera(38, 1, 0.005, 40);
    camera.position.set(2.4, 2.1, 2.6);
    this.camera = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0.05, 1.0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.14;
    controls.maxDistance = 4.2;
    controls.maxPolarAngle = 1.38;
    controls.minPolarAngle = 0.08;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.8;
    controls.panSpeed = 0.6;
    controls.screenSpacePanning = true;
    controls.autoRotateSpeed = 0.6;
    controls.addEventListener('start', () => {
      this.stopAutoRotate();
      if (this.cameraTween) this.cameraTween.kill();
      this.onUserInteract?.();
    });
    this.controls = controls;

    this.setupLights();

    // Postproceso: oclusión ambiental + salida con tone mapping
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const gtao = new SelectiveGTAOPass(scene, camera, 1, 1);
    gtao.blendIntensity = 0.85;
    gtao.updateGtaoMaterial({ radius: 0.06, distanceExponent: 1.2, thickness: 0.6, scale: 1.0, samples: 12 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    composer.addPass(gtao);
    composer.addPass(new OutputPass());
    this.composer = composer;
    this.gtao = gtao;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.fpsSamples = [];

    if (this.isMobile) this.setQuality('balanced');
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    // Respaldo para el giro del teléfono y barras del navegador móvil
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));

    renderer.setAnimationLoop(() => this.frame());
  }

  setupLights() {
    const s = this.scene;
    const hemi = new THREE.HemisphereLight('#f4f8ff', '#8d98a5', 0.55);
    s.add(hemi);

    // Luz principal: lámpara quirúrgica (blanca neutra, sombras suaves)
    const key = new THREE.SpotLight('#fffaf3', 26, 6, 0.55, 0.85, 1.6);
    key.position.set(0.12, 2.35, 0.5);
    key.target.position.set(0.02, TABLE_TOP, 0);
    key.castShadow = true;
    const sz = this.isMobile ? 1024 : 2048;
    key.shadow.mapSize.set(sz, sz);
    key.shadow.bias = -0.00012;
    key.shadow.normalBias = 0.012;
    key.shadow.radius = 4;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 4;
    s.add(key, key.target);
    this.keyLight = key;

    // Relleno suave lateral
    const fill = new THREE.DirectionalLight('#e8f0ff', 0.55);
    fill.position.set(-2.2, 2.6, 2.0);
    s.add(fill);

    // Luz de contorno
    const rim = new THREE.DirectionalLight('#ffffff', 0.5);
    rim.position.set(2.5, 1.8, -2.2);
    s.add(rim);

    // Sombra amplia del entorno (mesas, piso)
    const room = new THREE.DirectionalLight('#ffffff', 0.4);
    room.position.set(0.8, 4, 1.4);
    room.castShadow = true;
    room.shadow.mapSize.set(1024, 1024);
    room.shadow.camera.left = -2.2;
    room.shadow.camera.right = 2.2;
    room.shadow.camera.top = 2.2;
    room.shadow.camera.bottom = -2.2;
    room.shadow.camera.near = 1;
    room.shadow.camera.far = 7;
    room.shadow.bias = -0.0004;
    room.shadow.radius = 6;
    s.add(room);
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // En pantallas verticales se amplía el campo vertical para conservar el
    // encuadre horizontal pensado para escritorio (nada queda cortado a los lados).
    const refAspect = 1.25;
    if (aspect < refAspect) {
      const hHalf = Math.atan(Math.tan(THREE.MathUtils.degToRad(this.baseFov / 2)) * refAspect);
      const v = 2 * Math.atan(Math.tan(hHalf) / aspect);
      this.camera.fov = Math.min(THREE.MathUtils.radToDeg(v), 68);
    } else {
      this.camera.fov = this.baseFov;
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.width = w;
    this.height = h;
  }

  /** Calidad: 'high' (oclusión ambiental), 'balanced' (sin oclusión), 'low' (resolución 1x). */
  setQuality(q) {
    this.quality = q;
    this.gtao.enabled = q === 'high';
    const dpr = window.devicePixelRatio || 1;
    const ratio = q === 'high' ? Math.min(dpr, this.maxDpr) : q === 'balanced' ? Math.min(dpr, this.isMobile ? 1.5 : 1) : 1;
    this.renderer.setPixelRatio(ratio);
    this.resize();
  }

  onUpdate(fn) {
    this.updaters.add(fn);
    return () => this.updaters.delete(fn);
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.controls.update();
    this.guardCamera();
    this.updaters.forEach((fn) => fn(dt));
    if (this.quality === 'high') this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
    this.trackPerformance(dt);
  }

  /** Baja la calidad por escalones si la animación no mantiene ~24 cuadros/s. */
  trackPerformance(dt) {
    if (this.quality === 'low' || this.fixedQuality || document.hidden) return;
    this.fpsSamples.push(dt);
    if (this.fpsSamples.length >= 90) {
      const avg = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
      this.fpsSamples = [];
      if (avg > 1 / 24) {
        this.lowFrames = (this.lowFrames || 0) + 1;
        if (this.lowFrames >= 2) {
          const next = this.quality === 'high' ? 'balanced' : 'low';
          this.setQuality(next);
          this.lowFrames = 0;
          this.onQualityChange?.(next);
        }
      } else {
        this.lowFrames = 0;
      }
    }
  }

  /** Impide que la cámara atraviese el paciente o el piso. */
  guardCamera() {
    const c = this.camera.position;
    if (c.y < 0.3) c.y = 0.3;
    if (this.surfaceGuard) {
      const minY = this.surfaceGuard(c.x, c.z);
      if (Number.isFinite(minY) && c.y < minY + 0.05) c.y = minY + 0.05;
    }
    const t = this.controls.target;
    t.x = THREE.MathUtils.clamp(t.x, -1.4, 1.6);
    t.y = THREE.MathUtils.clamp(t.y, 0.4, 1.8);
    t.z = THREE.MathUtils.clamp(t.z, -1.4, 1.2);
  }

  // ---------------------------------------------------------------- cámara

  flyTo({ position, target }, duration = 1.4, ease = 'power2.inOut') {
    if (this.cameraTween) this.cameraTween.kill();
    this.stopAutoRotate();
    const cam = this.camera;
    const ctl = this.controls;
    const from = { p: cam.position.clone(), t: ctl.target.clone() };
    const to = { p: new THREE.Vector3(...position), t: new THREE.Vector3(...target) };
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const state = { k: 0 };
    // Trayectoria con ligero arco para que la cámara no atraviese objetos
    const mid = from.p.clone().lerp(to.p, 0.5);
    const lift = Math.min(0.35, from.p.distanceTo(to.p) * 0.18);
    mid.y += lift;
    const curve = new THREE.QuadraticBezierCurve3(from.p, mid, to.p);
    this.cameraTween = gsap.to(state, {
      k: 1,
      duration: reduce ? Math.min(duration, 0.4) : duration,
      ease,
      onUpdate: () => {
        cam.position.copy(curve.getPoint(state.k));
        ctl.target.lerpVectors(from.t, to.t, state.k);
      },
    });
    return this.cameraTween;
  }

  /** Tween de cámara para incluir dentro de una línea de tiempo GSAP. */
  cameraTo({ position, target }, duration = 1.2, ease = 'power2.inOut') {
    const cam = this.camera;
    const ctl = this.controls;
    const state = { k: 0 };
    let from = null;
    let curve = null;
    const to = { p: new THREE.Vector3(...position), t: new THREE.Vector3(...target) };
    return gsap.to(state, {
      k: 1,
      duration,
      ease,
      immediateRender: false,
      onStart: () => {
        if (this.userOverride) return;
        this.stopAutoRotate();
        from = { p: cam.position.clone(), t: ctl.target.clone() };
        const mid = from.p.clone().lerp(to.p, 0.5);
        mid.y += Math.min(0.25, from.p.distanceTo(to.p) * 0.15);
        curve = new THREE.QuadraticBezierCurve3(from.p, mid, to.p);
      },
      onUpdate: () => {
        if (!curve || this.userOverride) return;
        cam.position.copy(curve.getPoint(state.k));
        ctl.target.lerpVectors(from.t, to.t, state.k);
      },
    });
  }

  /** Órbita suave alrededor del objetivo actual (para vistas de verificación). */
  orbitTween(angle = 0.6, duration = 4) {
    const cam = this.camera;
    const ctl = this.controls;
    const state = { a: 0 };
    let start = null;
    return gsap.to(state, {
      a: angle,
      duration,
      ease: 'sine.inOut',
      immediateRender: false,
      onStart: () => {
        start = cam.position.clone().sub(ctl.target);
      },
      onUpdate: () => {
        if (!start || this.userOverride) return;
        const v = start.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), state.a);
        cam.position.copy(ctl.target).add(v);
      },
    });
  }

  dolly(factor) {
    const cam = this.camera;
    const t = this.controls.target;
    const dir = cam.position.clone().sub(t);
    const len = THREE.MathUtils.clamp(dir.length() * factor, this.controls.minDistance, this.controls.maxDistance);
    dir.setLength(len);
    const dest = t.clone().add(dir);
    this.flyTo({ position: dest.toArray(), target: t.toArray() }, 0.5, 'power2.out');
  }

  toggleAutoRotate() {
    this.controls.autoRotate = !this.controls.autoRotate;
    return this.controls.autoRotate;
  }

  stopAutoRotate() {
    if (this.controls.autoRotate) {
      this.controls.autoRotate = false;
      this.onAutoRotateChange?.(false);
    }
  }

  // ---------------------------------------------------------------- selección

  pick(clientX, clientY, objects) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(objects, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.selectable) o = o.parent;
      if (o) return o;
    }
    return null;
  }

  project(v) {
    const p = v.clone().project(this.camera);
    return {
      x: (p.x * 0.5 + 0.5) * this.width,
      y: (-p.y * 0.5 + 0.5) * this.height,
      visible: p.z < 1 && p.z > -1,
    };
  }
}
