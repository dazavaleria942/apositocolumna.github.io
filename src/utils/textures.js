import * as THREE from 'three';
import { makeValueNoise, fbm, rng, clamp } from './math.js';

// Texturas procedurales generadas en canvas. Evitan depender de imágenes externas
// y permiten que el proyecto funcione sin conexión.

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(c, { color = true, repeat = null, wrap = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

/** Hex sRGB → [r, g, b] en 0–255 (sin conversión a espacio lineal). */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Rellena un canvas píxel a píxel. fn(u, v) → [r, g, b] o valor gris. */
function paint(size, fn, h = size) {
  const c = canvas(size, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const v = fn(x / size, y / h, x, y);
      if (typeof v === 'number') {
        d[i] = d[i + 1] = d[i + 2] = clamp(v, 0, 255);
      } else {
        d[i] = clamp(v[0], 0, 255);
        d[i + 1] = clamp(v[1], 0, 255);
        d[i + 2] = clamp(v[2], 0, 255);
      }
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

const cache = new Map();
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

export function skinMaps() {
  return cached('skin', () => {
    const n = makeValueNoise(11, 64);
    const n2 = makeValueNoise(23, 128);
    const base = hexToRgb('#dcb59f');
    const map = paint(512, (u, v) => {
      const f = fbm(n, u * 16, v * 16, 4);
      const g = n2(u * 110, v * 110);
      const k = 0.92 + f * 0.14 + (g - 0.5) * 0.04;
      return [base[0] * k + 6 * (f - 0.5), base[1] * k, base[2] * k * 0.98];
    });
    const bump = paint(512, (u, v) => {
      const pores = n2(u * 180, v * 180);
      const fine = n(u * 60, v * 60);
      return 128 + (pores - 0.5) * 70 + (fine - 0.5) * 40;
    });
    return {
      map: toTexture(map, { repeat: [3, 3] }),
      bump: toTexture(bump, { color: false, repeat: [3, 3] }),
    };
  });
}

export function boneMaps() {
  return cached('bone', () => {
    const n = makeValueNoise(5, 64);
    const n2 = makeValueNoise(9, 128);
    const base = hexToRgb('#e7dcc6');
    const map = paint(256, (u, v) => {
      const f = fbm(n, u * 8, v * 8, 4);
      const k = 0.9 + f * 0.16;
      return [base[0] * k, base[1] * k * 0.995, base[2] * (k - 0.02)];
    });
    const bump = paint(256, (u, v) => 128 + (n2(u * 90, v * 90) - 0.5) * 90 + (fbm(n, u * 20, v * 20, 3) - 0.5) * 40);
    return {
      map: toTexture(map, { repeat: [1, 1] }),
      bump: toTexture(bump, { color: false, repeat: [1, 1] }),
    };
  });
}

/** Textura de tela no tejida / tejido según el tipo. */
export function fabricMaps(kind = 'drape') {
  return cached('fabric-' + kind, () => {
    const n = makeValueNoise(kind.length * 13, 64);
    const n2 = makeValueNoise(kind.length * 7 + 3, 256);
    const size = 512;
    let bumpFn;
    if (kind === 'gauze') {
      bumpFn = (u, v) => {
        const wx = Math.abs(Math.sin(u * Math.PI * 64));
        const wy = Math.abs(Math.sin(v * Math.PI * 64));
        const thread = Math.max(Math.pow(wx, 0.4) * 0.6, Math.pow(wy, 0.4) * 0.6);
        return 70 + thread * 150 + (n2(u * 200, v * 200) - 0.5) * 40;
      };
    } else if (kind === 'towel' || kind === 'blanket') {
      bumpFn = (u, v) => {
        const w = Math.sin(u * Math.PI * 140) * Math.sin(v * Math.PI * 140);
        return 128 + w * 30 + (fbm(n, u * 30, v * 30, 3) - 0.5) * 60;
      };
    } else if (kind === 'cap') {
      bumpFn = (u, v) => 128 + (fbm(n, u * 18, v * 30, 4) - 0.5) * 140 + (n2(u * 220, v * 220) - 0.5) * 30;
    } else {
      // no tejido (campo quirúrgico, bata)
      bumpFn = (u, v) => 128 + (n2(u * 240, v * 240) - 0.5) * 70 + (fbm(n, u * 24, v * 24, 3) - 0.5) * 50;
    }
    const bump = paint(size, bumpFn);
    return { bump: toTexture(bump, { color: false }) };
  });
}

/** Estampado típico de bata hospitalaria. */
export function gownMap() {
  return cached('gown', () => {
    const c = canvas(512);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#a9c0d1';
    ctx.fillRect(0, 0, 512, 512);
    const r = rng(4);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.05})`;
      ctx.fillRect(r() * 512, r() * 512, 2, 2);
    }
    ctx.fillStyle = '#7f9db4';
    const step = 32;
    for (let y = 0; y < 512; y += step) {
      for (let x = 0; x < 512; x += step) {
        const ox = (y / step) % 2 ? step / 2 : 0;
        ctx.save();
        ctx.translate(x + ox + 8, y + 8);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-2.6, -2.6, 5.2, 5.2);
        ctx.restore();
      }
    }
    return toTexture(c, { repeat: [5, 5] });
  });
}

/** Mapa de color del campo quirúrgico con banda adhesiva alrededor de la ventana. */
export function drapeColorMap({ uFn, vFn, window: win }) {
  return cached('drape-color', () => {
    const W = 2048;
    const H = 1024;
    const c = canvas(W, H);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#2f6c9c';
    ctx.fillRect(0, 0, W, H);
    // Variación sutil de tono (ruido a baja resolución escalado)
    const n = makeValueNoise(31, 64);
    const small = paint(256, (u, v) => 128 + (fbm(n, u * 22, v * 11, 3) - 0.5) * 60, 128);
    ctx.globalAlpha = 0.18;
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(small, 0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // Banda adhesiva (lámina de incisión) alrededor de la ventana
    const u0 = uFn(win.x0) * W;
    const u1 = uFn(win.x1) * W;
    const v0 = vFn(win.z0) * H;
    const v1 = vFn(win.z1) * H;
    const band = 0.028;
    const bu = Math.abs(uFn(win.x0 + band) - uFn(win.x0)) * W;
    const bv = Math.abs(vFn(win.z0 + band) - vFn(win.z0)) * H;
    const left = Math.min(u0, u1);
    const right = Math.max(u0, u1);
    const top = Math.min(v0, v1);
    const bottom = Math.max(v0, v1);
    ctx.fillStyle = 'rgba(214, 228, 238, 0.92)';
    ctx.fillRect(left - bu, top - bv, right - left + bu * 2, bottom - top + bv * 2);
    ctx.strokeStyle = 'rgba(40, 90, 130, 0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(left - bu, top - bv, right - left + bu * 2, bottom - top + bv * 2);
    return toTexture(c, { wrap: false });
  });
}

export function foamMap() {
  return cached('foam', () => {
    const n = makeValueNoise(3, 128);
    const c = paint(256, (u, v) => {
      const p = n(u * 120, v * 120);
      return 200 + p * 40;
    });
    return toTexture(c, { color: false, repeat: [2, 2] });
  });
}

export function floorMap() {
  return cached('floor', () => {
    const n = makeValueNoise(41, 64);
    const r = rng(9);
    const size = 1024;
    const c = paint(size, (u, v) => {
      const f = fbm(n, u * 10, v * 10, 4);
      const base = 178 + (f - 0.5) * 16;
      const seam = (Math.abs((u * 4) % 1) < 0.004 || Math.abs((v * 4) % 1) < 0.004) ? -18 : 0;
      return [base + seam - 6, base + seam, base + seam + 6];
    });
    const ctx = c.getContext('2d');
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = `rgba(${r() > 0.5 ? 255 : 90},${r() > 0.5 ? 255 : 100},${r() > 0.5 ? 255 : 110},0.12)`;
      ctx.fillRect(r() * size, r() * size, 1.5, 1.5);
    }
    return toTexture(c, { repeat: [3, 3] });
  });
}

export function backgroundTexture() {
  return cached('bg', () => {
    const c = canvas(16, 512);
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#d4dde6');
    g.addColorStop(0.55, '#e6ebf0');
    g.addColorStop(1, '#d9e1e8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 512);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Regla con marcas para medidores y probadores de profundidad. */
export function rulerTexture() {
  return cached('ruler', () => {
    const c = canvas(1024, 64);
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, '#e8ecf0');
    g.addColorStop(0.5, '#c4cad1');
    g.addColorStop(1, '#9aa3ad');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 64);
    ctx.fillStyle = '#26303a';
    for (let i = 0; i <= 100; i++) {
      const x = 12 + i * 10;
      const h = i % 10 === 0 ? 34 : i % 5 === 0 ? 24 : 14;
      ctx.fillRect(x, 0, 2, h);
    }
    return toTexture(c, { wrap: false });
  });
}

export function gauzeMap() {
  return cached('gauze-map', () => {
    const n = makeValueNoise(77, 64);
    const c = paint(256, (u, v) => {
      const wx = Math.abs(Math.sin(u * Math.PI * 32));
      const wy = Math.abs(Math.sin(v * Math.PI * 32));
      const t = Math.max(wx, wy);
      const k = 228 + t * 22 + (n(u * 40, v * 40) - 0.5) * 10;
      return [k, k, k - 3];
    });
    return toTexture(c, { repeat: [2, 2] });
  });
}

/** Etiqueta impresa (frascos, empaques). */
export function labelTexture(lines, { w = 512, h = 256, bg = '#ffffff', fg = '#123049', accent = '#1f6fb8' } = {}) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, w, h * 0.16);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    ctx.font = `${i === 0 ? 600 : 400} ${i === 0 ? h * 0.15 : h * 0.1}px "IBM Plex Sans", sans-serif`;
    ctx.fillText(line, w / 2, h * (0.42 + i * 0.2));
  });
  return toTexture(c, { wrap: false });
}

/** Mapa del apósito: borde adhesivo perforado y almohadilla central. */
export function dressingMap(padRect) {
  return cached('dressing', () => {
    const W = 1024;
    const H = 512;
    const c = canvas(W, H);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f2f4f5';
    ctx.fillRect(0, 0, W, H);
    // Perforaciones del borde adhesivo
    ctx.fillStyle = 'rgba(160,172,182,0.35)';
    for (let y = 8; y < H; y += 14) {
      for (let x = 8; x < W; x += 14) ctx.fillRect(x, y, 2, 2);
    }
    const [u0, v0, u1, v1] = padRect;
    const px = u0 * W;
    const py = v0 * H;
    const pw = (u1 - u0) * W;
    const ph = (v1 - v0) * H;
    ctx.fillStyle = '#ffffff';
    const r = 26;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, r);
    ctx.fill();
    // Patrón acolchado de la almohadilla
    ctx.strokeStyle = 'rgba(190, 205, 218, 0.55)';
    ctx.lineWidth = 2;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px + 10, py + 10, pw - 20, ph - 20, r - 8);
    ctx.clip();
    for (let i = -H; i < W; i += 22) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + H, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i + H, 0);
      ctx.lineTo(i, H);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(120, 160, 190, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, r);
    ctx.stroke();
    return toTexture(c, { wrap: false });
  });
}

/** Línea de incisión cerrada, representada de forma esquemática y no gráfica. */
export function incisionTexture() {
  return cached('incision', () => {
    const W = 1024;
    const H = 128;
    const c = canvas(W, H);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    const n = makeValueNoise(51, 64);
    // halo muy suave
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(176,110,100,0)');
    g.addColorStop(0.5, 'rgba(176,110,100,0.22)');
    g.addColorStop(1, 'rgba(176,110,100,0)');
    ctx.fillStyle = g;
    ctx.fillRect(40, 0, W - 80, H);
    // línea
    ctx.strokeStyle = 'rgba(128, 66, 66, 0.9)';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = 48; x <= W - 48; x += 4) {
      const y = H / 2 + (n(x / 60, 0.5) - 0.5) * 3;
      if (x === 48) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // atenuar extremos
    const fade = ctx.createLinearGradient(0, 0, W, 0);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(0.08, 'rgba(0,0,0,0)');
    fade.addColorStop(0.92, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    return toTexture(c, { wrap: false });
  });
}

/** Rejilla de leds para la lámpara quirúrgica. */
export function lampMap() {
  return cached('lamp', () => {
    const c = canvas(256);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#9aa6b2';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#ffffff';
    for (let ring = 0; ring < 4; ring++) {
      const count = 6 + ring * 6;
      const rr = 22 + ring * 30;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(128 + Math.cos(a) * rr, 128 + Math.sin(a) * rr, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.beginPath();
    ctx.arc(128, 128, 12, 0, Math.PI * 2);
    ctx.fill();
    return toTexture(c, { wrap: false });
  });
}

/** Rugosidad cepillada para acero quirúrgico. */
export function brushedRoughness() {
  return cached('brushed', () => {
    const n = makeValueNoise(61, 256);
    const c = paint(256, (u, v) => 90 + (n(u * 4, v * 220) - 0.5) * 70);
    return toTexture(c, { color: false, repeat: [1, 1] });
  });
}

/**
 * Capa pintable sobre la piel (antiséptico, humedad).
 * Devuelve el canvas, la textura y helpers para pintar en coordenadas del mundo.
 */
export function paintLayer({ x0, x1, z0, z1, w = 512, h = 256 }) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Coincide con conformGrid(): v = 1 (fila superior del canvas) corresponde a z0.
  const toPx = (x, z) => [((x - x0) / (x1 - x0)) * w, ((z - z0) / (z1 - z0)) * h];
  const scale = w / (x1 - x0);
  return {
    canvas: c,
    ctx,
    texture: tex,
    clear() {
      ctx.clearRect(0, 0, w, h);
      tex.needsUpdate = true;
    },
    dab(x, z, radius, color, alpha = 1, erase = false) {
      const [px, py] = toPx(x, z);
      const r = radius * scale;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, color.replace('ALPHA', String(alpha)));
      g.addColorStop(0.65, color.replace('ALPHA', String(alpha * 0.8)));
      g.addColorStop(1, color.replace('ALPHA', '0'));
      ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      tex.needsUpdate = true;
    },
    fill(color) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
      tex.needsUpdate = true;
    },
    fadeAll(amount) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0,0,0,${amount})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      tex.needsUpdate = true;
    },
  };
}
