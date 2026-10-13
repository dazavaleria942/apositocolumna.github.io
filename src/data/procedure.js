// Contenido de los pasos de cada etapa. Cada paso declara su animación por clave
// (ver src/animations/). Los textos se pueden editar sin tocar el código 3D.

export const ASEPSIS_STEPS = [
  { id: '2.1', title: 'Higiene de manos', text: 'Higiene quirúrgica de manos según protocolo institucional.', animation: 'hand-hygiene', icon: 'hands' },
  { id: '2.2', title: 'Elementos de protección', text: 'Guantes, bata, mascarilla y protección correspondiente.', animation: 'ppe', icon: 'ppe' },
  { id: '2.3', title: 'Campo estéril', text: 'Preparación del campo para disponer el material.', animation: 'sterile-field', icon: 'field' },
  { id: '2.4', title: 'Antisepsia', text: 'Preparación de la zona con la solución indicada.', animation: 'antisepsis', icon: 'drop' },
];

export const CLEANING_STEPS = [
  { id: '3.1', title: 'Preparar material', text: 'Gasas estériles, solución indicada y pinza.', animation: 'clean-prepare' },
  { id: '3.2', title: 'Observar la herida', text: 'Revisar el aspecto de la incisión.', animation: 'clean-observe' },
  { id: '3.3', title: 'Limpiar con la solución indicada', text: 'Una pasada por cada gasa.', animation: 'clean-solution' },
  { id: '3.4', title: 'De la zona más limpia a la menos limpia', text: 'Desde la incisión hacia la piel circundante.', animation: 'clean-direction' },
  { id: '3.5', title: 'Secar la piel circundante', text: 'Con gasa estéril, suavemente.', animation: 'clean-dry' },
];

export const ASSEMBLY_STEPS = [
  {
    id: '4.1',
    title: 'Tornillos pediculares',
    text: 'Colocación de los tornillos pediculares en los niveles previamente establecidos.',
    animation: 'pedicle-screw-placement',
    tools: ['sonda-pedicular', 'insertador', 'tornillos-pediculares'],
  },
  {
    id: '4.2',
    title: 'Medición de la barra',
    text: 'Medición de la longitud necesaria de la barra.',
    animation: 'rod-measurement',
    tools: ['medidor-barras'],
  },
  {
    id: '4.3',
    title: 'Corte y doblado',
    text: 'Adaptación de la barra a la curvatura del sistema.',
    animation: 'rod-cut-bend',
    tools: ['cortador-barras', 'doblador-barras', 'barras'],
  },
  {
    id: '4.4',
    title: 'Colocación de la barra',
    text: 'Colocación de la barra dentro de las cabezas de los tornillos.',
    animation: 'rod-placement',
    tools: ['pinza-porta-barras', 'barras'],
  },
  {
    id: '4.5',
    title: 'Reducción',
    text: 'Reducción de la barra hasta alcanzar la posición prevista.',
    animation: 'rod-reduction',
    tools: ['reductor-barras'],
  },
  {
    id: '4.6',
    title: 'Caps',
    text: 'Colocación y fijación inicial de los caps de bloqueo.',
    animation: 'cap-placement',
    tools: ['destornillador-caps', 'caps'],
  },
  {
    id: '4.7',
    title: 'Torque final',
    text: 'Realización del ajuste final con llave dinamométrica y contra-torque.',
    animation: 'final-torque',
    tools: ['llave-dinamometrica', 'contra-torque'],
  },
  {
    id: '4.8',
    title: 'Verificación',
    text: 'Verificación de la posición y estabilidad del sistema.',
    animation: 'assembly-verification',
    tools: [],
    checklist: ['Tornillos posicionados', 'Barras asentadas', 'Caps fijados', 'Sistema estable'],
  },
];

export const DRESSING_STEPS = [
  { id: '5.1', title: 'Higiene y protección', text: 'Higiene de manos y colocación de los elementos de protección.', animation: 'dressing-hygiene' },
  {
    id: '5.2',
    title: 'Revisión',
    text: 'Revisar el estado de la herida antes de colocar el nuevo apósito.',
    animation: 'wound-review',
    checklist: ['Sangrado', 'Secreción', 'Enrojecimiento', 'Apertura de bordes'],
  },
  {
    id: '5.3',
    title: 'Campo estéril',
    text: 'Preparar el campo estéril y el material necesario.',
    animation: 'dressing-field',
    items: ['Campo estéril', 'Gasas', 'Solución indicada', 'Apósito', 'Elementos de protección'],
  },
  { id: '5.4', title: 'Limpieza', text: 'Limpiar con la solución indicada, siguiendo la técnica establecida.', animation: 'dressing-cleaning' },
  { id: '5.5', title: 'Secado', text: 'Secar suavemente la piel circundante.', animation: 'dressing-drying' },
  { id: '5.6', title: 'Colocación del apósito', text: 'Colocar el apósito estéril cubriendo completamente la incisión.', animation: 'dressing-placement' },
  { id: '5.7', title: 'Fijación', text: 'Fijar de manera segura evitando presión excesiva.', animation: 'dressing-fixation' },
  {
    id: '5.8',
    title: 'Comprobación',
    text: 'Comprobar que el apósito quede limpio, seco y correctamente adherido.',
    animation: 'dressing-check',
    checklist: ['Limpio', 'Seco', 'Bien adherido', 'Incisión cubierta'],
  },
  { id: '5.9', title: 'Registro', text: 'Registrar el procedimiento y el estado de la herida.', animation: 'dressing-record' },
];

export const RECORD_59 = {
  title: 'REGISTRO DEL PROCEDIMIENTO',
  fields: [
    ['Estado de la herida', 'Sin alteraciones visibles'],
    ['Apósito', 'Estéril'],
    ['Estado', 'Seco y bien adherido'],
    ['Observaciones', 'Procedimiento registrado'],
    ['Fecha', 'DD/MM/AAAA'],
  ],
};

export const FINAL_STEP = {
  id: '6.1',
  title: 'Verificación final',
  text: 'Revisión del resultado y registro del procedimiento.',
  animation: 'final-check',
  checklist: ['Herida revisada', 'Limpieza realizada', 'Apósito colocado', 'Apósito correctamente fijado', 'Estado registrado'],
  form: [
    { key: 'fecha', label: 'Fecha', placeholder: 'DD/MM/AAAA', value: '' },
    { key: 'procedimiento', label: 'Procedimiento', value: 'Instrumentación de columna y colocación de apósito' },
    { key: 'herida', label: 'Estado de la herida', value: 'Sin alteraciones visibles' },
    { key: 'aposito', label: 'Tipo de apósito', value: 'Apósito estéril' },
    { key: 'condicion', label: 'Condición final', value: 'Limpio, seco y bien adherido' },
    { key: 'observaciones', label: 'Observaciones', placeholder: 'Escriba aquí', value: '', multiline: true },
    { key: 'responsable', label: 'Responsable', placeholder: 'Nombre y cargo', value: '' },
  ],
};

export const FINAL_SCREEN = {
  title: 'PROCEDIMIENTO COMPLETADO',
  checklist: ['Sistema verificado', 'Herida revisada', 'Apósito colocado', 'Registro completado'],
};
