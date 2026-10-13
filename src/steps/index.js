import { MATERIAL_CATEGORIES } from '../data/materials.js';
import { ASEPSIS_STEPS, CLEANING_STEPS, ASSEMBLY_STEPS, DRESSING_STEPS, FINAL_STEP, RECORD_59 } from '../data/procedure.js';
import { ASSEMBLY_ANIMATIONS } from '../animations/assembly.js';
import { DRESSING_ANIMATIONS } from '../animations/dressing.js';
import { MATERIAL_ANIMATIONS } from '../animations/materials.js';

// Une los datos de cada paso con su estado inicial de escena y su animación.
// state: estado absoluto con el que comienza el paso (ver World.applyState).

const ANIMATIONS = { ...ASSEMBLY_ANIMATIONS, ...DRESSING_ANIMATIONS, ...MATERIAL_ANIMATIONS };

const PRE_OP = { incision: false, auxField: false, auxItems: false };
const POST_OP = { incision: true, assembly: 8, auxField: true, auxItems: true };

const materials = MATERIAL_CATEGORIES.map((c) => ({
  ...c,
  text: c.fn,
  animation: 'materials-category',
  state: { ...PRE_OP, highlight: c.main },
}));

const asepsisStates = {
  '2.1': PRE_OP,
  '2.2': PRE_OP,
  '2.3': PRE_OP,
  '2.4': { ...PRE_OP, auxField: true },
};
const asepsis = ASEPSIS_STEPS.map((s) => ({ ...s, state: asepsisStates[s.id] }));

const cleaningStates = {
  '3.1': { incision: true, auxField: true, auxItems: false },
  '3.2': { incision: true, auxField: true, auxItems: true },
  '3.3': { incision: true, auxField: true, auxItems: true },
  '3.4': { incision: true, auxField: true, auxItems: true },
  '3.5': { incision: true, auxField: true, auxItems: true },
};
const cleaning = CLEANING_STEPS.map((s) => ({ ...s, state: cleaningStates[s.id] }));

const assembly = ASSEMBLY_STEPS.map((s, i) => ({
  ...s,
  state: {
    incision: true,
    antiseptic: true,
    xray: i === 0 ? 0 : 1,
    assembly: i,
    workRod: s.id === '4.3' ? 'long' : 'none',
    torqueMarks: s.id === '4.8',
    auxField: true,
    auxItems: true,
  },
}));

const dressingStates = {
  '5.1': { ...POST_OP, xray: 1 },
  '5.2': { ...POST_OP },
  '5.3': { ...POST_OP, auxField: false, auxItems: false },
  '5.4': { ...POST_OP },
  '5.5': { ...POST_OP, wet: true },
  '5.6': { ...POST_OP },
  '5.7': { ...POST_OP, dressing: 'placed' },
  '5.8': { ...POST_OP, dressing: 'fixed' },
  '5.9': { ...POST_OP, dressing: 'fixed' },
};
const dressing = DRESSING_STEPS.map((s) => ({ ...s, state: dressingStates[s.id] }));

const registro = [{ ...FINAL_STEP, state: { ...POST_OP, dressing: 'fixed' } }];

export const STAGE_STEPS = [materials, asepsis, cleaning, assembly, dressing, registro];

export function buildAnimation(step, ctx, tl) {
  const fn = ANIMATIONS[step.animation];
  if (!fn) {
    console.warn('Animación no encontrada:', step.animation);
    return;
  }
  fn({ ...ctx, step, data: { record: RECORD_59 } }, tl);
}
