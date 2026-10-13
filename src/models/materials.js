import * as THREE from 'three';
import { skinMaps, boneMaps, fabricMaps, gownMap, foamMap, gauzeMap, brushedRoughness } from '../utils/textures.js';

// Biblioteca de materiales realistas (PBR) compartidos por todos los modelos.
let lib = null;

export function materials() {
  if (lib) return lib;
  const skin = skinMaps();
  const bone = boneMaps();
  const drapeFab = fabricMaps('drape');
  const capFab = fabricMaps('cap');
  const towelFab = fabricMaps('towel');
  const gauzeFab = fabricMaps('gauze');
  const brushed = brushedRoughness();

  const steel = new THREE.MeshPhysicalMaterial({
    color: '#d3d8de',
    metalness: 1,
    roughness: 0.26,
    roughnessMap: brushed,
    envMapIntensity: 1.1,
  });

  lib = {
    skin: new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      map: skin.map,
      bumpMap: skin.bump,
      bumpScale: 0.35,
      roughness: 0.58,
      sheen: 0.15,
      sheenColor: new THREE.Color('#fff1ea'),
      sheenRoughness: 0.6,
      envMapIntensity: 0.5,
    }),
    bone: new THREE.MeshStandardMaterial({
      color: '#f1e6d2',
      map: bone.map,
      bumpMap: bone.bump,
      bumpScale: 0.6,
      roughness: 0.72,
      envMapIntensity: 0.6,
    }),
    disc: new THREE.MeshPhysicalMaterial({
      color: '#c7d3dc',
      roughness: 0.45,
      clearcoat: 0.3,
      clearcoatRoughness: 0.5,
      envMapIntensity: 0.6,
    }),
    drape: new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      bumpMap: drapeFab.bump,
      bumpScale: 0.6,
      roughness: 0.92,
      sheen: 0.6,
      sheenColor: new THREE.Color('#6fa0c8'),
      sheenRoughness: 0.8,
      side: THREE.DoubleSide,
      envMapIntensity: 0.4,
    }),
    gown: new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      map: gownMap(),
      bumpMap: drapeFab.bump,
      bumpScale: 0.5,
      roughness: 0.88,
      sheen: 0.5,
      sheenColor: new THREE.Color('#dbe7f0'),
      side: THREE.DoubleSide,
      envMapIntensity: 0.4,
    }),
    cap: new THREE.MeshPhysicalMaterial({
      color: '#5d8fc0',
      bumpMap: capFab.bump,
      bumpScale: 1.2,
      roughness: 0.9,
      sheen: 0.6,
      sheenColor: new THREE.Color('#a9c8e6'),
      envMapIntensity: 0.4,
    }),
    blanket: new THREE.MeshPhysicalMaterial({
      color: '#dfe4e8',
      bumpMap: towelFab.bump,
      bumpScale: 1.0,
      roughness: 0.95,
      sheen: 0.7,
      sheenColor: new THREE.Color('#ffffff'),
      envMapIntensity: 0.35,
    }),
    towel: new THREE.MeshPhysicalMaterial({
      color: '#3a7aaa',
      bumpMap: towelFab.bump,
      bumpScale: 0.9,
      roughness: 0.95,
      sheen: 0.5,
      sheenColor: new THREE.Color('#7fb0d6'),
      envMapIntensity: 0.35,
    }),
    sterileField: new THREE.MeshPhysicalMaterial({
      color: '#2f6c9c',
      bumpMap: drapeFab.bump,
      bumpScale: 0.6,
      roughness: 0.92,
      sheen: 0.6,
      sheenColor: new THREE.Color('#6fa0c8'),
      side: THREE.DoubleSide,
      envMapIntensity: 0.4,
    }),
    gauze: new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      map: gauzeMap(),
      bumpMap: gauzeFab.bump,
      bumpScale: 1.4,
      roughness: 0.95,
      sheen: 0.8,
      sheenColor: new THREE.Color('#ffffff'),
      envMapIntensity: 0.4,
    }),
    foam: new THREE.MeshStandardMaterial({
      color: '#d9dee3',
      bumpMap: foamMap(),
      bumpScale: 1.2,
      roughness: 0.95,
    }),
    pad: new THREE.MeshPhysicalMaterial({
      color: '#33414f',
      roughness: 0.55,
      clearcoat: 0.25,
      clearcoatRoughness: 0.6,
    }),
    steel,
    steelDark: new THREE.MeshPhysicalMaterial({ color: '#8d959e', metalness: 1, roughness: 0.38, envMapIntensity: 1 }),
    tableSteel: new THREE.MeshPhysicalMaterial({ color: '#c9cfd5', metalness: 0.9, roughness: 0.32, envMapIntensity: 0.9 }),
    titanium: new THREE.MeshPhysicalMaterial({ color: '#c4c9d0', metalness: 1, roughness: 0.3, envMapIntensity: 1.5 }),
    titaniumTulip: new THREE.MeshPhysicalMaterial({ color: '#9fb4d0', metalness: 0.85, roughness: 0.3, envMapIntensity: 1.6 }),
    titaniumGold: new THREE.MeshPhysicalMaterial({ color: '#cfae63', metalness: 1, roughness: 0.27, envMapIntensity: 1.2 }),
    rod: new THREE.MeshPhysicalMaterial({ color: '#d2d6dc', metalness: 1, roughness: 0.2, envMapIntensity: 1.6 }),
    handle: new THREE.MeshPhysicalMaterial({ color: '#2d3742', roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.5 }),
    handleLight: new THREE.MeshPhysicalMaterial({ color: '#d8dde2', roughness: 0.45, clearcoat: 0.3 }),
    accentBlue: new THREE.MeshPhysicalMaterial({ color: '#1f6fd0', roughness: 0.4, clearcoat: 0.4 }),
    accentTeal: new THREE.MeshPhysicalMaterial({ color: '#13a596', roughness: 0.4, clearcoat: 0.4 }),
    accentGold: new THREE.MeshPhysicalMaterial({ color: '#d4a640', roughness: 0.35, metalness: 0.4 }),
    plasticWhite: new THREE.MeshPhysicalMaterial({ color: '#f4f6f8', roughness: 0.4, clearcoat: 0.3, clearcoatRoughness: 0.4 }),
    plasticBlue: new THREE.MeshPhysicalMaterial({ color: '#2a6fb6', roughness: 0.4, clearcoat: 0.3 }),
    glove: new THREE.MeshPhysicalMaterial({ color: '#e3d6bd', roughness: 0.5, sheen: 0.3, clearcoat: 0.2 }),
    floor: null,
    // Efectos
    glowTeal: new THREE.MeshBasicMaterial({ color: '#19c2b0', transparent: true, opacity: 0.85, depthWrite: false }),
    glowBlue: new THREE.MeshBasicMaterial({ color: '#3d8ef0', transparent: true, opacity: 0.9, depthWrite: false }),
    ghost: new THREE.MeshBasicMaterial({ color: '#3d8ef0', transparent: true, opacity: 0.25, depthWrite: false }),
  };
  return lib;
}

/** Resaltado discreto de un objeto (emisión azul suave). */
const originals = new WeakMap();
export function setHighlight(obj, on, color = '#2f80ed', intensity = 0.35) {
  obj.traverse((o) => {
    if (!o.isMesh || o.userData.noHighlight) return;
    if (on) {
      if (!originals.has(o)) originals.set(o, o.material);
      const base = originals.get(o);
      if (!base.emissive) return;
      const m = base.clone();
      m.emissive = new THREE.Color(color);
      m.emissiveIntensity = intensity;
      o.material = m;
    } else if (originals.has(o)) {
      const cur = o.material;
      o.material = originals.get(o);
      if (cur !== o.material) cur.dispose();
      originals.delete(o);
    }
  });
}
