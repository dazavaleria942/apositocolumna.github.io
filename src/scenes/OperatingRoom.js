import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TABLE_TOP, TABLE, BACK_TABLE, AUX_TABLE } from './layout.js';
import { materials } from '../models/materials.js';
import { floorMap, lampMap } from '../utils/textures.js';
import { mesh, lathe } from '../utils/geometry.js';

// Entorno: piso, mesa quirúrgica, cabezal prono, apoyabrazos, mesas y lámpara.

function legsTable({ cx, cz, top, sx, sz, M, name }) {
  const g = new THREE.Group();
  g.name = name;
  const slab = mesh(new RoundedBoxGeometry(sx, 0.022, sz, 3, 0.006), M.tableSteel);
  slab.position.set(0, top - 0.011, 0);
  g.add(slab);
  const rim = mesh(new RoundedBoxGeometry(sx + 0.01, 0.012, sz + 0.01, 2, 0.004), M.tableSteel);
  rim.position.set(0, top - 0.03, 0);
  g.add(rim);
  for (const ix of [-1, 1]) {
    for (const iz of [-1, 1]) {
      const leg = mesh(new THREE.CylinderGeometry(0.012, 0.012, top - 0.05, 16), M.tableSteel);
      leg.position.set(ix * (sx / 2 - 0.03), (top - 0.05) / 2 + 0.04, iz * (sz / 2 - 0.03));
      g.add(leg);
      const wheel = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 20), M.handle);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(ix * (sx / 2 - 0.03), 0.025, iz * (sz / 2 - 0.03));
      g.add(wheel);
    }
  }
  const shelf = mesh(new RoundedBoxGeometry(sx - 0.04, 0.012, sz - 0.04, 2, 0.004), M.tableSteel);
  shelf.position.y = 0.22;
  g.add(shelf);
  g.position.set(cx, 0, cz);
  return g;
}

export function buildOperatingRoom() {
  const M = materials();
  const room = new THREE.Group();
  room.name = 'quirofano';

  // Piso
  const floorMat = new THREE.MeshStandardMaterial({ map: floorMap(), roughness: 0.42, metalness: 0, envMapIntensity: 0.6 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 64), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = 'piso';
  room.add(floor);

  // Mesa quirúrgica
  const table = new THREE.Group();
  table.name = 'mesa-quirurgica';
  const len = TABLE.x1 - TABLE.x0;
  const cx = (TABLE.x0 + TABLE.x1) / 2;
  const pad = mesh(new RoundedBoxGeometry(len, 0.07, TABLE.halfWidth * 2, 4, 0.025), M.pad, 'colchon');
  pad.position.set(cx, TABLE_TOP - 0.035, 0);
  table.add(pad);
  const top = mesh(new RoundedBoxGeometry(len - 0.04, 0.05, TABLE.halfWidth * 2 - 0.02, 2, 0.01), M.tableSteel);
  top.position.set(cx, TABLE_TOP - 0.095, 0);
  table.add(top);
  for (const s of [-1, 1]) {
    const rail = mesh(new THREE.BoxGeometry(len - 0.1, 0.03, 0.01), M.steel);
    rail.position.set(cx, TABLE_TOP - 0.1, s * (TABLE.halfWidth + 0.005));
    table.add(rail);
  }
  const column = mesh(lathe([[0.0001, 0], [0.13, 0], [0.13, 0.03], [0.09, 0.05], [0.085, TABLE_TOP - 0.18], [0.0001, TABLE_TOP - 0.18]], 40), M.tableSteel);
  column.position.set(cx + 0.05, 0.03, 0);
  table.add(column);
  const base = mesh(new RoundedBoxGeometry(0.9, 0.06, 0.5, 3, 0.02), M.tableSteel);
  base.position.set(cx + 0.05, 0.03, 0);
  table.add(base);
  const head = mesh(new RoundedBoxGeometry(0.4, 0.05, 0.36, 3, 0.015), M.tableSteel);
  head.position.set(cx + 0.05, TABLE_TOP - 0.15, 0);
  table.add(head);

  // Cabezal prono de espuma
  const headrest = mesh(new RoundedBoxGeometry(0.25, 0.075, 0.23, 4, 0.02), M.foam, 'cabezal');
  headrest.position.set(-0.79, TABLE_TOP + 0.0375, 0);
  table.add(headrest);

  // Apoyabrazos
  for (const s of [-1, 1]) {
    const board1 = mesh(new RoundedBoxGeometry(0.13, 0.04, 0.32, 3, 0.012), M.pad);
    board1.position.set(-0.485, TABLE_TOP - 0.025, s * 0.41);
    table.add(board1);
    const board2 = mesh(new RoundedBoxGeometry(0.36, 0.04, 0.13, 3, 0.012), M.pad);
    board2.position.set(-0.66, TABLE_TOP - 0.025, s * 0.47);
    table.add(board2);
    const post = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 12), M.steel);
    post.position.set(-0.485, TABLE_TOP - 0.1, s * 0.3);
    table.add(post);
  }
  room.add(table);

  // Mesa de instrumental (con compresa azul)
  const back = legsTable({ cx: BACK_TABLE.center[0], cz: BACK_TABLE.center[2], top: BACK_TABLE.top, sx: BACK_TABLE.size[0], sz: BACK_TABLE.size[1], M, name: 'mesa-instrumental' });
  const towelGeo = new THREE.PlaneGeometry(BACK_TABLE.size[0] + 0.12, BACK_TABLE.size[1] + 0.12, 80, 40);
  towelGeo.rotateX(-Math.PI / 2);
  const tp = towelGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i);
    const z = tp.getZ(i);
    const ox = Math.max(Math.abs(x) - BACK_TABLE.size[0] / 2, 0);
    const oz = Math.max(Math.abs(z) - BACK_TABLE.size[1] / 2, 0);
    const o = Math.hypot(ox, oz);
    tp.setXYZ(i, x - Math.sign(x) * ox * 0.9, BACK_TABLE.top + 0.0015 - o * 0.95 + 0.0008 * Math.sin(x * 40) * Math.sin(z * 37), z - Math.sign(z) * oz * 0.9);
  }
  towelGeo.computeVertexNormals();
  const towel = mesh(towelGeo, M.sterileField, 'compresa');
  back.add(towel);
  towel.position.set(0, 0, 0);
  room.add(back);

  // Mesa auxiliar
  const aux = legsTable({ cx: AUX_TABLE.center[0], cz: AUX_TABLE.center[2], top: AUX_TABLE.top, sx: AUX_TABLE.size[0], sz: AUX_TABLE.size[1], M, name: 'mesa-auxiliar' });
  room.add(aux);

  // Lámpara quirúrgica
  const lamp = new THREE.Group();
  lamp.name = 'lampara';
  const ledMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveMap: lampMap(), emissiveIntensity: 1.6, roughness: 0.3 });
  const shellMat = new THREE.MeshPhysicalMaterial({ color: '#eef1f4', roughness: 0.35, clearcoat: 0.6 });
  const shell = mesh(lathe([[0.0001, 0.07], [0.12, 0.065], [0.27, 0.03], [0.3, 0], [0.29, -0.012], [0.0001, -0.012]], 64), shellMat);
  lamp.add(shell);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.285, 64), ledMat);
  face.rotation.x = Math.PI / 2;
  face.position.y = -0.0125;
  lamp.add(face);
  const handleL = mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.09, 20), M.plasticWhite);
  handleL.position.y = -0.055;
  lamp.add(handleL);
  lamp.position.set(0.1, 2.38, 0.45);
  lamp.rotation.set(0.42, 0, 0.12);
  lamp.userData.noShadow = true;
  room.add(lamp);
  const arm = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 16), shellMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(-0.35, 2.75, 0.62);
  arm.userData.noShadow = true;
  room.add(arm);
  const drop = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.36, 16), shellMat);
  drop.position.set(0.1, 2.58, 0.55);
  drop.userData.noShadow = true;
  room.add(drop);

  room.userData = { backTable: back, auxTable: aux, lamp };
  return room;
}
