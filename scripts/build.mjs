// Genera dist/index.html: un único archivo autocontenido (JS, CSS y fuentes
// incrustados) que se abre con doble clic, sin servidor ni conexión.
//
// Uso:  npm install   (solo la primera vez, instala esbuild)
//       npm run build
//
// Si esbuild no está instalado pero Bun sí, se usa Bun como empaquetador.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');
await mkdir(out, { recursive: true });

const alias = {
  three: join(root, 'src/vendor/three/three.module.min.js'),
};
const aliasPlugin = {
  name: 'vendor-alias',
  setup(build) {
    build.onResolve({ filter: /^three$/ }, () => ({ path: alias.three }));
    build.onResolve({ filter: /^three\/addons\// }, (a) => ({ path: join(root, 'src/vendor/three/addons', a.path.slice('three/addons/'.length)) }));
    build.onResolve({ filter: /^gsap$/ }, () => ({ path: join(root, 'src/vendor/gsap/index.js') }));
  },
};

async function bundle() {
  try {
    const esbuild = await import('esbuild');
    const r = await esbuild.build({
      entryPoints: [join(root, 'src/main.js')],
      bundle: true,
      format: 'esm',
      minify: true,
      write: false,
      target: 'es2020',
      plugins: [aliasPlugin],
      legalComments: 'none',
    });
    console.log('Empaquetado con esbuild');
    return r.outputFiles[0].text;
  } catch (err) {
    if (err?.code !== 'ERR_MODULE_NOT_FOUND') throw err;
    // Alternativa: Bun (usa los alias de jsconfig.json)
    const tmp = join(out, '_bundle.js');
    execFileSync('bun', ['build', join(root, 'src/main.js'), '--minify', '--outfile', tmp], { cwd: root, stdio: 'inherit' });
    console.log('Empaquetado con Bun');
    return await readFile(tmp, 'utf8');
  }
}

async function inlineCss() {
  let css = await readFile(join(root, 'src/styles/main.css'), 'utf8');
  const urls = [...css.matchAll(/url\('([^']+\.woff2)'\)/g)];
  for (const [full, rel] of urls) {
    const file = resolve(join(root, 'src/styles'), rel);
    const b64 = (await readFile(file)).toString('base64');
    css = css.replace(full, `url(data:font/woff2;base64,${b64})`);
  }
  return css;
}

const js = (await bundle()).replace(/<\/script/gi, '<\\/script');
const css = await inlineCss();
let html = await readFile(join(root, 'index.html'), 'utf8');
html = html
  .replace(/\s*<link rel="stylesheet"[^>]*>/, `\n    <style>${css}</style>`)
  .replace(/\s*<!-- compat:inicio -->[\s\S]*?<!-- compat:fin -->/, '')
  .replace(/\s*<!-- Dependencias[\s\S]*?<\/script>/, '')
  // Los modelos externos opcionales se buscan en ../public/models/ desde dist/
  .replace('<meta charset="utf-8" />', '<meta charset="utf-8" />\n    <meta name="models-base" content="../public/models/" />')
  .replace(/<script type="module" src="src\/main.js"><\/script>/, () => `<script type="module">${js}</script>`);
await writeFile(join(out, 'index.html'), html);
if (existsSync(join(out, '_bundle.js'))) {
  const { rm } = await import('node:fs/promises');
  await rm(join(out, '_bundle.js'));
}
console.log('Listo: dist/index.html (' + Math.round(html.length / 1024) + ' KB)');
