// Iconografía SVG (trazo 1.75, esquinas redondeadas). Se hereda el color con currentColor.
const s = (body, vb = '0 0 24 24') =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  plus: s('<path d="M12 5v14M5 12h14"/>'),
  minus: s('<path d="M5 12h14"/>'),
  rotate: s('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
  home: s('<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v9h11v-9"/>'),
  target: s('<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>'),
  play: s('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>'),
  pause: s('<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="2.6"/>'),
  repeat: s('<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5"/><path d="M20 4v4.5h-4.5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5"/><path d="M4 20v-4.5h4.5"/>'),
  prev: s('<path d="M15 5.5 8.5 12l6.5 6.5"/>'),
  next: s('<path d="m9 5.5 6.5 6.5L9 18.5"/>'),
  check: s('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  close: s('<path d="M6 6l12 12M18 6 6 18"/>'),
  info: s('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>'),
  warning: s('<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/>'),
  spine: s(
    '<rect x="8" y="2.5" width="8" height="3.6" rx="1.4"/><rect x="7.5" y="7.6" width="9" height="3.8" rx="1.4"/><rect x="7.2" y="12.9" width="9.6" height="3.9" rx="1.4"/><path d="M9 18.6c1 2 5 2 6 0"/><path d="M4.5 4.3h2M17.5 4.3h2M4 9.5h2.5M17.5 9.5H20M3.8 14.8h2.6M17.6 14.8h2.6"/>',
  ),
  hands: s(
    '<path d="M7 20.5v-5.2L4.6 11a1.3 1.3 0 0 1 2.2-1.3l1.7 2.4V5a1.3 1.3 0 0 1 2.6 0v5.5"/><path d="M11.1 10.2V3.9a1.3 1.3 0 0 1 2.6 0v6.3"/><path d="M13.7 10.2V5.2a1.3 1.3 0 0 1 2.6 0v6.9c0 3.9-1.6 6.3-3.6 8.4"/><path d="M18.5 3.5c.8 1 .8 2 0 3M20.5 2.5c1.4 1.7 1.4 3.6 0 5.3"/>',
  ),
  gloves: s(
    '<path d="M8 21v-3.5l-2.6-4.3a1.3 1.3 0 0 1 2.2-1.4L9 13.5V6a1.25 1.25 0 0 1 2.5 0v5.5"/><path d="M11.5 11V4.3a1.25 1.25 0 0 1 2.5 0V11"/><path d="M14 11V5.3a1.25 1.25 0 0 1 2.5 0v6.2"/><path d="M16.5 11.5V7.5a1.25 1.25 0 0 1 2.5 0v6c0 3.2-1.2 5.2-2.6 7.5"/><path d="M7.5 18.5h9.5"/>',
  ),
  gown: s('<path d="M9 3.5 5 6.5l-1.5 6 2.6 1 .9-2.6V20.5h10v-9.6l.9 2.6 2.6-1L19 6.5l-4-3"/><path d="M9 3.5c.6 1.6 1.7 2.4 3 2.4s2.4-.8 3-2.4"/><path d="M12 6v14.5"/>'),
  mask: s('<path d="M4.5 9.5c2.5-1.3 5-2 7.5-2s5 .7 7.5 2v4c-1.5 3-4.2 4.5-7.5 4.5s-6-1.5-7.5-4.5z"/><path d="M4.5 10.5H2.8a1.3 1.3 0 0 0 0 2.6h2M19.5 10.5h1.7a1.3 1.3 0 0 1 0 2.6h-2"/><path d="M7.5 11h9M7.5 13.5h9"/>'),
  goggles: s('<path d="M3 10.5c0-1.4 1.1-2.5 2.5-2.5h13c1.4 0 2.5 1.1 2.5 2.5v2.2c0 1.8-1.4 3.3-3.2 3.3h-1.9a2.5 2.5 0 0 1-2.2-1.4l-.2-.4a1.7 1.7 0 0 0-3 0l-.2.4A2.5 2.5 0 0 1 8.1 16H6.2C4.4 16 3 14.5 3 12.7z"/>'),
  drop: s('<path d="M12 3.5s6 6.4 6 10.6a6 6 0 0 1-12 0c0-4.2 6-10.6 6-10.6z"/><path d="M9.3 14.5a2.8 2.8 0 0 0 2.7 2.7"/>'),
  field: s('<path d="M3 8.5 12 4l9 4.5-9 4.5z"/><path d="M3 12.5 12 17l9-4.5"/><path d="M3 16.5 12 21l9-4.5"/>'),
  form: s('<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4"/>'),
  grid: s('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>'),
  expand: s('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  compress: s('<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'),
  clipboard: s('<rect x="5" y="4.5" width="14" height="16" rx="2"/><path d="M9 4.5V3.5h6v1"/><path d="m8.5 13 2.5 2.5 4.5-5"/>'),
  calendar: s('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>'),
};

export function icon(name, cls = '') {
  return `<span class="icon ${cls}">${ICONS[name] || ''}</span>`;
}
