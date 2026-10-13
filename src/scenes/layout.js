// Distribución espacial del quirófano. Unidades: metros.
// Eje X: cráneo (-) → pies (+). Eje Y: arriba. Eje Z: lateral.
// El paciente está en decúbito prono sobre la mesa quirúrgica.

export const TABLE_TOP = 0.92; // superficie del colchón de la mesa
export const TABLE = {
  x0: -0.95,
  x1: 1.05,
  halfWidth: 0.26,
};

// Ventana (abertura) del campo quirúrgico sobre la región lumbar.
export const WINDOW = {
  x0: -0.15,
  x1: 0.17,
  z0: -0.078,
  z1: 0.078,
};

// Incisión representada de forma esquemática sobre la línea media.
export const INCISION = {
  x0: -0.078,
  x1: 0.07,
};

// Mesa de instrumental (lado opuesto al observador).
export const BACK_TABLE = {
  center: [-0.3, 0, -1.0],
  top: 0.98,
  size: [1.25, 0.62],
};

// Mesa auxiliar para material de curación.
export const AUX_TABLE = {
  center: [0.82, 0, -0.74],
  top: 0.99,
  size: [0.56, 0.4],
};

// Niveles instrumentados en la simulación (definidos en la planificación).
export const INSTRUMENTED_LEVELS = ['L3', 'L4', 'L5'];
