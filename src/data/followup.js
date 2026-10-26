// Etapa 6 — Posquirúrgico: evolución y seguimiento del apósito.
//
// ESCENARIO ILUSTRATIVO. Los 8 días muestran cómo PODRÍA verse un apósito que no
// se cambia, para aprender a reconocer cambios. No es una evolución universal: el
// ritmo depende de la herida, el tipo de apósito, las indicaciones clínicas y el
// fabricante. El pus NO forma parte de esta secuencia; se muestra solo como
// signo de alarma.
//
// cond: parámetros visuales del modelo 3D (0–1).
//   stain  extensión del exudado sobre la almohadilla   hue  0 serohemático → 1 seroso
//   wet    humedad visible                              soil suciedad / decoloración
//   lift   bordes despegados [cerca-caudal, cerca-craneal, lejos-caudal, lejos-craneal]
//   wrinkle arrugas  swell abultamiento  crust bordes secos  fray fibras sueltas
//   strike exudado que traspasa a la superficie         macer maceración de la piel
//   redness enrojecimiento de la piel                   pus  exudado purulento

export const FOLLOWUP_TEXT = {
  scenario: 'Escenario ilustrativo de 8 días consecutivos sin cambio de apósito, solo para comparar. No es una evolución universal: depende de la herida, el tipo de apósito, las indicaciones clínicas y el fabricante.',
  evaluation: 'Evaluar el estado de la herida y del apósito. Realizar el cambio cuando esté indicado, siguiendo las recomendaciones clínicas y del fabricante.',
  alarm: 'Requiere valoración por un profesional sanitario. No esperar al día 8 ni a la fecha de cambio prevista.',
  cottonPractice: 'En la práctica, la gasa se cambia en cuanto se humedece, se traspasa o se despega. Aquí se mantiene solo para comparar.',
};

export const MATERIALS = {
  silicona: {
    key: 'silicona',
    name: 'Silicona',
    long: 'Apósito de espuma con borde de silicona',
    note: 'Almohadilla absorbente y borde adhesivo de silicona. Tiempo de permanencia según el fabricante y la indicación clínica.',
  },
  algodon: {
    key: 'algodon',
    name: 'Algodón',
    long: 'Gasa de algodón fijada con esparadrapo',
    note: 'Absorbe rápido pero no aísla de la humedad. Se cambia cuando está húmeda, traspasada o despegada.',
  },
};

export const INDICATORS = {
  ok: { label: 'Vigilar', detail: 'Íntegro: vigilar en cada valoración', tone: 'teal' },
  review: { label: 'Revisar', detail: 'Revisar adhesión y extensión del exudado', tone: 'amber' },
  evaluate: { label: 'Evaluar cambio', detail: 'Evaluar el cambio según indicación y fabricante', tone: 'amber' },
  change: { label: 'Requiere cambio', detail: 'Húmedo, traspasado, despegado o deteriorado', tone: 'red' },
};

const C = (o) => ({ stain: 0, hue: 0, wet: 0, soil: 0, lift: [0, 0, 0, 0], wrinkle: 0, swell: 0, crust: 0, fray: 0, strike: 0, macer: 0, redness: 0, pus: 0, ...o });

export const DAYS = {
  silicona: [
    {
      title: 'Recién colocado',
      indicator: 'ok',
      changes: ['Superficie limpia y seca', 'Borde de silicona adherido, sin arrugas'],
      surroundings: 'Piel circundante íntegra, sin enrojecimiento.',
      text: 'Punto de partida para comparar. Registrar fecha y tipo de apósito.',
      cond: C({}),
    },
    {
      title: 'Exudado inicial',
      indicator: 'ok',
      changes: ['Pequeña mancha serohemática en la almohadilla', 'El exudado no traspasa la superficie'],
      surroundings: 'Piel sin cambios.',
      text: 'Algo de exudado en los primeros días puede ser esperable. La almohadilla lo retiene.',
      cond: C({ stain: 0.13, hue: 0.1, wet: 0.15 }),
    },
    {
      title: 'Absorción en curso',
      indicator: 'ok',
      changes: ['Mancha algo mayor y de tono más claro (seroso)', 'Bordes íntegros'],
      surroundings: 'Piel sin cambios.',
      text: 'Vigilar cuánto se acerca la mancha al borde de la almohadilla.',
      cond: C({ stain: 0.23, hue: 0.45, wet: 0.12, swell: 0.15 }),
    },
    {
      title: 'Almohadilla en uso',
      indicator: 'ok',
      changes: ['Mancha contenida dentro de la almohadilla', 'Ligero abultamiento por absorción'],
      surroundings: 'Piel sin maceración.',
      text: 'Mientras esté íntegro, limpio por fuera y adherido, se continúa la vigilancia.',
      cond: C({ stain: 0.33, hue: 0.7, wet: 0.1, swell: 0.35, soil: 0.05 }),
    },
    {
      title: 'Borde que se levanta',
      indicator: 'review',
      changes: ['Una esquina del borde comienza a despegarse', 'Pelusa adherida en el borde'],
      surroundings: 'Piel sin cambios.',
      text: 'Si el borde se despega, el apósito deja de sellar y de proteger la herida.',
      cond: C({ stain: 0.41, hue: 0.8, wet: 0.08, swell: 0.45, soil: 0.15, lift: [0.45, 0, 0, 0], wrinkle: 0.12 }),
    },
    {
      title: 'Pérdida parcial de adhesión',
      indicator: 'review',
      changes: ['Borde levantado en dos esquinas', 'Pequeñas arrugas en la silicona'],
      surroundings: 'Leve marca de presión en la piel del borde.',
      text: 'Revisar la adhesión en cada valoración y anotar la evolución.',
      cond: C({ stain: 0.5, hue: 0.9, wet: 0.06, swell: 0.55, soil: 0.25, lift: [0.65, 0.35, 0, 0], wrinkle: 0.3 }),
    },
    {
      title: 'Exudado cerca del borde',
      indicator: 'evaluate',
      changes: ['El exudado se acerca al borde de la almohadilla', 'Adhesión reducida en tres esquinas'],
      surroundings: 'Piel circundante sin enrojecimiento.',
      text: 'Evaluar el cambio según la saturación, la adhesión y las indicaciones del fabricante.',
      cond: C({ stain: 0.66, hue: 0.95, wet: 0.08, swell: 0.7, soil: 0.35, lift: [0.75, 0.5, 0.25, 0], wrinkle: 0.45 }),
    },
    {
      title: 'Evaluar reemplazo',
      indicator: 'evaluate',
      changes: ['Almohadilla con exudado extenso', 'Borde despegado y desgastado'],
      surroundings: 'Revisar la piel al retirar el apósito.',
      text: 'Momento de valorar la herida y el apósito y decidir el cambio.',
      cond: C({ stain: 0.8, hue: 1, wet: 0.1, swell: 0.8, soil: 0.45, lift: [0.88, 0.62, 0.42, 0.18], wrinkle: 0.6 }),
    },
  ],
  algodon: [
    {
      title: 'Recién colocado',
      indicator: 'ok',
      changes: ['Gasa de algodón blanca y seca', 'Esparadrapo bien adherido'],
      surroundings: 'Piel circundante íntegra.',
      text: 'El algodón absorbe rápido, pero no aísla de la humedad exterior.',
      cond: C({}),
    },
    {
      title: 'Exudado que traspasa',
      indicator: 'review',
      changes: ['Mancha serohemática que llega a la superficie', 'Zona húmeda visible'],
      surroundings: 'Piel sin cambios.',
      text: 'Si la humedad traspasa la gasa, se pierde la barrera: revisar y cambiar según indicación.',
      cond: C({ stain: 0.36, hue: 0.15, wet: 0.75, strike: 0.7 }),
    },
    {
      title: 'Gasa húmeda',
      indicator: 'change',
      changes: ['Mancha extensa y húmeda', 'Esparadrapo levantado en una esquina'],
      surroundings: 'Piel del borde blanquecina por la humedad (maceración).',
      text: 'Un apósito húmedo o traspasado requiere cambio; no se espera a un día fijo.',
      cond: C({ stain: 0.56, hue: 0.4, wet: 0.95, strike: 1, lift: [0.4, 0, 0, 0], macer: 0.35, wrinkle: 0.15 }),
    },
    {
      title: 'Exudado seco',
      indicator: 'change',
      changes: ['La mancha se seca y endurece la gasa', 'Bordes de la mancha más oscuros'],
      surroundings: 'Maceración en el borde de la piel.',
      text: 'El exudado seco puede adherir la gasa a la herida y dificultar su retiro.',
      cond: C({ stain: 0.64, hue: 0.7, wet: 0.35, strike: 1, crust: 0.55, soil: 0.25, fray: 0.2, lift: [0.5, 0.2, 0, 0], macer: 0.45, wrinkle: 0.3 }),
    },
    {
      title: 'Pérdida de integridad',
      indicator: 'change',
      changes: ['Fibras sueltas en los bordes', 'Esparadrapo despegado en dos esquinas'],
      surroundings: 'Piel macerada alrededor del esparadrapo.',
      text: 'Un apósito que pierde integridad ya no protege la herida.',
      cond: C({ stain: 0.7, hue: 0.85, wet: 0.3, strike: 1, crust: 0.7, soil: 0.42, fray: 0.45, lift: [0.65, 0.45, 0, 0], macer: 0.5, wrinkle: 0.5 }),
    },
    {
      title: 'Apósito desplazado',
      indicator: 'change',
      changes: ['La gasa se arruga y se desplaza', 'Suciedad acumulada en el esparadrapo'],
      surroundings: 'Bordes de la herida parcialmente expuestos.',
      text: 'Una herida expuesta pierde la protección frente a la contaminación externa.',
      cond: C({ stain: 0.76, hue: 0.95, wet: 0.25, strike: 1, crust: 0.8, soil: 0.58, fray: 0.6, lift: [0.78, 0.6, 0.3, 0], macer: 0.5, wrinkle: 0.7 }),
    },
    {
      title: 'Deterioro avanzado',
      indicator: 'change',
      changes: ['Tono grisáceo y manchas secas', 'Bordes abiertos y sin fijación'],
      surroundings: 'Piel irritada por el adhesivo y la humedad.',
      text: 'Material deteriorado: no cumple su función de barrera.',
      cond: C({ stain: 0.82, hue: 1, wet: 0.2, strike: 1, crust: 0.9, soil: 0.72, fray: 0.78, lift: [0.86, 0.72, 0.5, 0.3], macer: 0.45, wrinkle: 0.85 }),
    },
    {
      title: 'Evaluar reemplazo',
      indicator: 'change',
      changes: ['Material sin integridad ni barrera', 'Fijación insuficiente'],
      surroundings: 'Revisar la piel y la herida al retirar el apósito.',
      text: 'Momento de valorar la herida y realizar el cambio indicado.',
      cond: C({ stain: 0.87, hue: 1, wet: 0.2, strike: 1, crust: 1, soil: 0.82, fray: 0.92, lift: [0.92, 0.8, 0.62, 0.45], macer: 0.4, wrinkle: 1 }),
    },
  ],
};

// Signos de alarma. visual: cómo se representa en el modelo 3D (si es visible).
export const ALARM_SIGNS = [
  { key: 'pus', label: 'Pus', visual: 'pus' },
  { key: 'olor', label: 'Mal olor', visual: null },
  { key: 'enrojecimiento', label: 'Aumento del enrojecimiento', visual: 'redness' },
  { key: 'dolor', label: 'Dolor', visual: null },
  { key: 'fiebre', label: 'Fiebre', visual: null },
];

/** Condición del día con signos de alarma superpuestos (pus, enrojecimiento). */
export function conditionFor(material, day, signs = []) {
  const base = DAYS[material][day - 1].cond;
  const c = { ...base, lift: [...base.lift] };
  if (signs.includes('pus')) {
    c.pus = 1;
    c.stain = Math.max(c.stain, 0.45);
    c.wet = Math.max(c.wet, 0.4);
  }
  if (signs.includes('enrojecimiento')) c.redness = 1;
  return c;
}

export function lerpCondition(a, b, t) {
  const out = {};
  for (const k of Object.keys(b)) {
    if (Array.isArray(b[k])) out[k] = b[k].map((v, i) => a[k][i] + (v - a[k][i]) * t);
    else out[k] = a[k] + (b[k] - a[k]) * t;
  }
  return out;
}
