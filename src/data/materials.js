// Etapa 1 — Materiales. Solo los elementos fundamentales se muestran en 3D;
// los demás aparecen en la lista secundaria.
export const MATERIAL_CATEGORIES = [
  {
    id: '1.1',
    title: 'Material para preparar el pedículo',
    fn: 'Localizar, preparar y comprobar el trayecto donde irá el tornillo.',
    main: ['sonda-pedicular', 'palpador', 'probador-profundidad'],
    secondary: ['Machos de rosca', 'Guías o introductores'],
  },
  {
    id: '1.2',
    title: 'Material para colocar los tornillos',
    fn: 'Introducir y posicionar los tornillos pediculares.',
    main: ['tornillos-pediculares', 'porta-tornillos', 'insertador'],
    secondary: ['Mango en T', 'Adaptadores del sistema'],
  },
  {
    id: '1.3',
    title: 'Material para preparar y colocar las barras',
    fn: 'Conectar los tornillos y formar la estructura de estabilización.',
    main: ['barras', 'medidor-barras', 'doblador-barras', 'pinza-porta-barras'],
    secondary: ['Cortador de barras', 'Introductor de barras'],
  },
  {
    id: '1.4',
    title: 'Material para reducir y fijar la barra',
    fn: 'Llevar la barra hasta la cabeza de los tornillos y mantenerla en posición.',
    main: ['reductor-barras', 'pinza-reductora', 'caps'],
    secondary: ['Instrumento de compresión/distracción, si está indicado'],
  },
  {
    id: '1.5',
    title: 'Material para el ajuste final',
    fn: 'Asegurar el sistema y aplicar el torque establecido por el fabricante.',
    main: ['llave-dinamometrica', 'contra-torque', 'destornillador-caps'],
    secondary: ['Mango en T', 'Adaptadores de torque'],
  },
  {
    id: '1.6',
    title: 'Material de conexión',
    fn: 'Unir o complementar diferentes partes de la instrumentación.',
    main: ['conector-transversal', 'conector-longitudinal'],
    secondary: ['Conectores laterales', 'Adaptadores según el sistema'],
  },
  {
    id: '1.7',
    title: 'Implantes principales',
    fn: 'Estos elementos quedan implantados en el paciente.',
    main: ['tornillos-pediculares', 'barras', 'caps', 'conector-transversal'],
    secondary: [],
    implants: true,
  },
];
