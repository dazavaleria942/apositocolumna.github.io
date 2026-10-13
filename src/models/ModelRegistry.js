import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Registro de modelos externos (GLB/GLTF).
 *
 * Todos los modelos del tutorial se generan de forma procedural. Para sustituir
 * uno por un modelo propio, copie el archivo en public/models/ y declare la
 * sustitución en public/models/manifest.json (ver manifest.example.json).
 *
 * Claves admitidas en el manifiesto:
 *   - "display:<id>"  → modelo de la mesa de instrumental (p. ej. display:insertador)
 *   - "patient:head"  → cabeza del paciente
 *   - "room:extra"    → objetos decorativos adicionales del quirófano
 * Cada entrada: { "file": "archivo.glb", "scale": 1, "position": [x,y,z], "rotation": [x,y,z] }
 */
export class ModelRegistry {
  constructor(base = null) {
    // dist/index.html declara su propia ruta base mediante <meta name="models-base">
    this.base = base || document.querySelector('meta[name="models-base"]')?.content || 'public/models/';
    this.loader = new GLTFLoader();
    this.loaded = [];
  }

  async manifest() {
    if (location.protocol === 'file:') return null; // los navegadores bloquean fetch() en file://
    try {
      const res = await fetch(this.base + 'manifest.json', { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async load(entry) {
    const gltf = await this.loader.loadAsync(this.base + entry.file);
    const root = gltf.scene;
    if (entry.scale) root.scale.setScalar(entry.scale);
    if (entry.position) root.position.fromArray(entry.position);
    if (entry.rotation) root.rotation.set(...entry.rotation);
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return root;
  }

  async applyOverrides(world) {
    const man = await this.manifest();
    if (!man) return;
    for (const [key, entry] of Object.entries(man)) {
      if (key.startsWith('_')) continue;
      try {
        const model = await this.load(entry);
        if (key.startsWith('display:')) {
          const id = key.slice(8);
          const holder = world.display[id];
          if (!holder) continue;
          holder.clear();
          holder.add(model);
        } else if (key === 'room:extra') {
          world.scene.add(model);
        } else if (key === 'patient:head') {
          const head = world.patient.group.getObjectByName('cabeza');
          if (head) {
            model.position.copy(head.position);
            head.visible = false;
            world.patient.group.add(model);
          }
        }
        this.loaded.push(key);
      } catch (err) {
        console.warn('[modelos] No se pudo cargar', key, err);
      }
    }
  }
}

export { THREE };
