import { h, clear, pad2 } from './dom.js';
import { icon } from './icons.js';
import { INSTRUMENTS } from '../data/instruments.js';
import { STAGES, APP_TEXT } from '../data/stages.js';
import { DAYS, INDICATORS, MATERIALS, FOLLOWUP_TEXT, ALARM_SIGNS } from '../data/followup.js';

const THUMB_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10"><rect width="16" height="10" fill="#e3e9ef"/></svg>');
const IND_ICON = { teal: 'check', amber: 'warning', red: 'warning' };

function fmtDate(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
}

/** Panel lateral: etapa, paso actual, contenido contextual, progreso y navegación. */
export class Panel {
  constructor(parent, handlers) {
    this.handlers = handlers;
    this.scroll = h('div', { class: 'panel-scroll' });
    this.progressList = h('ol', { class: 'progress-list' });
    this.progressFill = h('span', { class: 'progress-fill' });
    this.progressPct = h('span', { class: 'progress-pct' });
    this.prevBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => handlers.prev() }, '← Anterior');
    this.nextBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => handlers.next() }, 'Continuar →');
    this.root = h('aside', { class: 'panel', 'aria-label': 'Información del paso' },
      this.scroll,
      h('footer', { class: 'panel-foot' },
        h('div', { class: 'progress-head' }, h('h2', { class: 'progress-title' }, 'PROGRESO DEL PROCEDIMIENTO'), this.progressStage = h('span', { class: 'progress-stage' }), this.progressPct),
        this.progressList,
        h('div', { class: 'progress-bar', role: 'progressbar', 'aria-label': 'Progreso del procedimiento' }, this.progressFill),
        h('div', { class: 'nav-buttons' }, this.prevBtn, this.nextBtn),
      ),
    );
    parent.append(this.root);
    this.selected = null;
  }

  // ------------------------------------------------------------------ render principal

  render(ctx) {
    const { stageIdx, stepIdx, steps, completed, progress, isFirst, isLast } = ctx;
    this.ctx = ctx;
    const stage = STAGES[stageIdx];
    const step = steps[stepIdx];
    clear(this.scroll);

    this.scroll.append(
      h('header', { class: 'stage-head' },
        h('div', { class: 'stage-num', 'aria-hidden': 'true' }, pad2(stage.id)),
        h('div', {},
          h('p', { class: 'stage-kicker' }, `Etapa ${stage.id} de ${STAGES.length}`),
          h('h1', { class: 'stage-title' }, stage.title))),
    );

    let title = step.title;
    let text = step.text;
    let count = `Paso ${stepIdx + 1} de ${steps.length}`;
    if (stage.key === 'posquirurgico') {
      const d = DAYS[ctx.follow.material][step.day - 1];
      title = `Día ${step.day}: ${d.title}`;
      text = d.text;
      count = `Día ${step.day} de 8`;
    }
    const card = h('section', { class: 'step-card' + (stage.key === 'posquirurgico' ? ' is-day' : ''), 'aria-live': 'polite' },
      h('div', { class: 'step-meta' }, h('span', { class: 'step-id' }, step.id), h('span', { class: 'step-count' }, count)),
      h('h2', { class: 'step-title' }, title),
      text ? h('p', { class: 'step-text' }, text) : null,
    );
    this.scroll.append(card);

    const body = h('section', { class: 'stage-body' });
    this.scroll.append(body);
    const kind = stage.key;
    if (kind === 'materiales') this.renderMaterials(body, step);
    else if (kind === 'asepsia') this.renderList(body, steps, stepIdx, { icons: true });
    else if (kind === 'limpieza') {
      this.renderList(body, steps, stepIdx, {});
      body.append(this.note(APP_TEXT.protocolNote));
    } else if (kind === 'ensamblaje') this.renderAssembly(body, steps, stepIdx, step);
    else if (kind === 'aposito') this.renderDressing(body, steps, stepIdx, step);
    else if (kind === 'posquirurgico') this.renderFollowUp(body, stepIdx, step, ctx.follow, ctx.thumbs);
    else if (kind === 'registro') this.renderRecord(body, step);
    this.scroll.append(h('p', { class: 'disclaimer disclaimer-inline' }, APP_TEXT.disclaimer));

    // Progreso
    clear(this.progressList);
    STAGES.forEach((s, i) => {
      const state = completed.has(i) ? 'done' : i === stageIdx ? 'current' : 'pending';
      const mark = state === 'done' ? icon('check') : `<span class="pdot"></span>`;
      this.progressList.append(h('li', { class: 'p-' + state },
        h('button', { type: 'button', class: 'p-row', onclick: () => this.handlers.goStage(i), 'aria-current': state === 'current' ? 'step' : null },
          h('span', { class: 'p-mark', html: mark }),
          h('span', { class: 'p-num' }, pad2(s.id)),
          h('span', { class: 'p-label' }, h('span', { class: 'p-long' }, s.progressLabel), h('span', { class: 'p-short' }, s.nav)))));
    });
    this.progressFill.style.transform = `scaleX(${progress})`;
    this.progressPct.textContent = Math.round(progress * 100) + '%';
    this.progressStage.textContent = `Paso ${step.id}`;
    this.prevBtn.disabled = isFirst;
    this.nextBtn.textContent = isLast ? 'Finalizar' : 'Continuar →';
    this.scroll.scrollTop = 0;
  }

  note(text, tone = 'neutral') {
    return h('p', { class: 'panel-note tone-' + tone, html: icon('info') + `<span>${text}</span>` });
  }

  renderList(body, steps, current, { icons = false } = {}) {
    const ol = h('ol', { class: 'step-list' });
    steps.forEach((s, i) => {
      const state = i === current ? 'is-current' : i < current ? 'is-done' : '';
      ol.append(h('li', { class: state },
        h('button', { type: 'button', class: 'sl-row', onclick: () => this.handlers.goStep(i) },
          icons && s.icon ? h('span', { class: 'sl-icon', html: icon(s.icon) }) : h('span', { class: 'sl-id' }, s.id),
          h('span', { class: 'sl-text' }, h('span', { class: 'sl-title' }, s.title), icons ? h('span', { class: 'sl-sub' }, s.text) : null),
          h('span', { class: 'sl-check', html: icon('check') }))));
    });
    body.append(ol);
  }

  // ------------------------------------------------------------------ materiales

  renderMaterials(body, cat) {
    if (cat.implants) body.append(h('p', { class: 'panel-note tone-teal', html: icon('info') + '<span>Estos elementos quedan implantados en el paciente.</span>' }));
    body.append(h('h3', { class: 'block-title' }, 'Elementos principales'));
    const list = h('div', { class: 'item-list' });
    cat.main.forEach((id) => {
      const info = INSTRUMENTS[id];
      list.append(h('button', {
        type: 'button',
        class: 'item-btn' + (this.selected === id ? ' is-selected' : ''),
        'data-id': id,
        onclick: () => this.handlers.selectInstrument(id),
      }, h('span', { class: 'item-name' }, info.name), info.implant ? h('span', { class: 'tag tag-teal' }, 'Implante') : null));
    });
    body.append(list);
    if (cat.secondary.length) {
      body.append(h('h3', { class: 'block-title' }, 'También se utilizan'));
      body.append(h('ul', { class: 'secondary' }, cat.secondary.map((t) => h('li', {}, t))));
    }
    this.infoCard = h('div', { class: 'info-card', 'aria-live': 'polite' });
    body.append(this.infoCard);
    this.showInfo(this.selected && cat.main.includes(this.selected) ? this.selected : null);
  }

  showInfo(id) {
    this.selected = id;
    if (!this.infoCard) return;
    clear(this.infoCard);
    this.root.querySelectorAll('.item-btn').forEach((b) => b.classList.toggle('is-selected', b.dataset.id === id));
    if (!id) {
      this.infoCard.classList.add('is-empty');
      this.infoCard.append(h('p', { class: 'info-hint', html: icon('target') + '<span>Seleccione un elemento en la mesa o en la lista para ver su función.</span>' }));
      return;
    }
    const info = INSTRUMENTS[id];
    this.infoCard.classList.remove('is-empty');
    this.infoCard.append(
      h('div', { class: 'info-label' }, 'Nombre'),
      h('div', { class: 'info-name' }, info.name.toUpperCase()),
      h('div', { class: 'info-label' }, 'Función'),
      h('p', { class: 'info-fn' }, info.fn),
    );
  }

  // ------------------------------------------------------------------ ensamblaje

  renderAssembly(body, steps, current, step) {
    if (step.tools?.length) {
      body.append(h('h3', { class: 'block-title' }, 'En este paso'));
      body.append(h('div', { class: 'chips' }, step.tools.map((id) => h('span', { class: 'chip' }, INSTRUMENTS[id]?.name || id))));
    }
    if (step.id === '4.7') body.append(this.note(APP_TEXT.manufacturer, 'blue'));
    if (step.id === '4.3') body.append(this.note('Longitud y curvatura según la medición realizada.', 'neutral'));
    body.append(h('h3', { class: 'block-title' }, 'Secuencia'));
    this.renderList(body, steps, current, {});
  }

  // ------------------------------------------------------------------ apósito

  renderDressing(body, steps, current, step) {
    if (step.items) {
      body.append(h('h3', { class: 'block-title' }, 'Material'));
      body.append(h('div', { class: 'chips' }, step.items.map((t) => h('span', { class: 'chip' }, t))));
    }
    if (step.id === '5.4') body.append(this.note('Una gasa por pasada, sin regresar a la zona ya limpia.', 'neutral'));
    body.append(h('h3', { class: 'block-title' }, 'Secuencia'));
    this.renderList(body, steps, current, {});
    body.append(this.note(APP_TEXT.protocolNote));
  }

  // ------------------------------------------------------------------ registro final

  // ------------------------------------------------------------------ posquirúrgico

  renderFollowUp(body, idx, step, follow, thumbs) {
    const mat = follow.material;
    const d = DAYS[mat][step.day - 1];
    const ind = INDICATORS[d.indicator];

    // Tipo de apósito
    body.append(h('div', { class: 'fu-material' },
      h('span', { class: 'fu-label', id: 'fu-mat-label' }, 'Tipo de apósito'),
      h('div', { class: 'seg', role: 'radiogroup', 'aria-labelledby': 'fu-mat-label' },
        Object.values(MATERIALS).map((m) => h('button', {
          type: 'button',
          role: 'radio',
          'aria-checked': String(m.key === mat),
          class: 'seg-btn' + (m.key === mat ? ' is-on' : ''),
          onclick: () => this.handlers.setMaterial(m.key),
        }, m.name)))));
    body.append(h('p', { class: 'fu-mat-note' }, h('strong', {}, MATERIALS[mat].long + '. '), MATERIALS[mat].note));

    // Tarjeta del día
    const card = h('section', { class: `fu-daycard tone-${ind.tone}`, 'aria-label': `Estado del día ${step.day}` },
      h('div', { class: 'fu-ind-row' },
        h('span', { class: `fu-ind tone-${ind.tone}`, html: icon(IND_ICON[ind.tone]) + `<span>${ind.label}</span>` }),
        h('span', { class: 'fu-ind-detail' }, ind.detail)),
      h('h3', { class: 'fu-sub' }, 'Cambios visibles'),
      h('ul', { class: 'fu-changes' }, d.changes.map((c) => h('li', {}, c))),
      h('p', { class: 'fu-surr' }, h('strong', {}, 'Entorno: '), d.surroundings));
    if (mat === 'algodon' && d.indicator === 'change') card.append(h('p', { class: 'fu-practice', html: icon('info') + `<span>${FOLLOWUP_TEXT.cottonPractice}</span>` }));
    body.append(card);

    // Los 8 días
    body.append(h('div', { class: 'fu-days-head' },
      h('h3', { class: 'block-title' }, 'Los 8 días'),
      h('button', { type: 'button', class: 'link-btn', onclick: () => this.handlers.openGallery(), html: icon('grid') + '<span>Comparar</span>' })));
    body.append(h('ol', { class: 'fu-days' }, DAYS[mat].map((dd, i) => {
      const di = INDICATORS[dd.indicator];
      const url = thumbs[mat][i];
      return h('li', {},
        h('button', {
          type: 'button',
          class: 'fu-mini' + (i === idx ? ' is-current' : ''),
          'aria-current': i === idx ? 'step' : null,
          'aria-label': `Día ${i + 1}: ${dd.title}. ${di.label}`,
          onclick: () => this.handlers.goStep(i),
        },
        h('span', { class: 'fu-mini-thumb' },
          h('img', { 'data-thumb': `${mat}-${i + 1}`, src: url || THUMB_PLACEHOLDER, class: url ? 'is-ready' : '', alt: '' })),
        h('span', { class: 'fu-mini-meta' },
          h('span', { class: 'fu-mini-day' }, `Día ${i + 1}`),
          h('span', { class: 'fu-mini-title' }, dd.title),
          h('span', { class: `fu-dot tone-${di.tone}` }, di.label))));
    })));
    body.append(h('button', { type: 'button', class: 'btn btn-ghost btn-block fu-compare', onclick: () => this.handlers.openGallery(), html: icon('grid') + '<span>Vista ampliada: comparar los 8 días</span>' }));

    // Signos de alarma
    this.signBtns = ALARM_SIGNS.map((a) => h('button', {
      type: 'button',
      class: 'sign-chip',
      'aria-pressed': String(follow.signs.includes(a.key)),
      'data-key': a.key,
      onclick: () => this.handlers.toggleSign(a.key),
    }, a.label));
    this.alarmBox = h('div', { class: 'fu-alarm', role: 'alert' });
    body.append(h('section', { class: 'fu-alarm-block' },
      h('h3', { class: 'block-title' }, 'Signos de alarma'),
      h('p', { class: 'fu-alarm-q' }, 'Marque si aparece alguno. No se espera al día 8.'),
      h('div', { class: 'sign-chips' }, this.signBtns),
      this.alarmBox,
      h('button', { type: 'button', class: 'link-btn', onclick: () => this.handlers.alarmExample() }, 'Ver un ejemplo de signos visibles en el modelo 3D')));
    this.updateFollowSigns(follow);

    body.append(this.note(FOLLOWUP_TEXT.scenario));
  }

  updateFollowSigns(follow) {
    if (!this.alarmBox) return;
    this.signBtns.forEach((b) => b.setAttribute('aria-pressed', String(follow.signs.includes(b.dataset.key))));
    const labels = ALARM_SIGNS.filter((a) => follow.signs.includes(a.key)).map((a) => a.label.toLowerCase());
    this.alarmBox.hidden = !labels.length;
    this.alarmBox.innerHTML = labels.length
      ? icon('warning') + `<div><strong>Signos de alarma: ${labels.join(', ')}.</strong><span>${FOLLOWUP_TEXT.alarm}</span></div>`
      : '';
  }

  // ------------------------------------------------------------------ registro

  renderRecord(body, step) {
    body.append(h('h3', { class: 'block-title' }, 'Lista de verificación'));
    this.finalChecks = step.checklist.map((t) => h('li', {}, h('span', { class: 'tick', html: icon('check') }), h('span', {}, t)));
    body.append(h('ul', { class: 'final-checklist' }, this.finalChecks));

    // Ejemplo diligenciado (simulación educativa)
    const ex = step.example;
    const exValue = (f) => (f.type === 'date' ? fmtDate(ex[f.key]) : ex[f.key]);
    body.append(h('section', { class: 'rec-example', 'aria-label': 'Ejemplo diligenciado. Simulación educativa con datos ficticios' },
      h('div', { class: 'rec-ex-ribbon' }, 'SIMULACIÓN EDUCATIVA'),
      h('p', { class: 'rec-ex-note' }, 'Ejemplo diligenciado con datos ficticios. No corresponde a un paciente real.'),
      h('dl', { class: 'rec-ex-list' }, step.form.flatMap((f) => [h('dt', {}, f.label), h('dd', {}, exValue(f))])),
      h('button', { type: 'button', class: 'btn btn-ghost btn-block', onclick: () => fill(ex, true) }, 'Usar el ejemplo en el formulario')));

    // Formulario
    body.append(h('h3', { class: 'block-title' }, 'Registro del seguimiento'));
    const exampleFlag = h('p', { class: 'rec-flag', hidden: true }, 'Formulario con datos de ejemplo (simulación educativa).');
    const alarm = h('div', { class: 'fu-alarm', role: 'alert', hidden: true, html: icon('warning') + `<div><strong>Secreción purulenta: signo de alarma.</strong><span>${FOLLOWUP_TEXT.alarm}</span></div>` });
    const form = h('form', { class: 'record-form', onsubmit: (e) => { e.preventDefault(); this.handlers.finish(); } }, exampleFlag);
    const fields = {};
    step.form.forEach((f) => {
      const id = 'f-' + f.key;
      let control;
      if (f.type === 'select') {
        control = h('select', { id, name: f.key },
          h('option', { value: '' }, 'Seleccione'),
          f.options.map((o) => h('option', { value: o }, o)));
        if (f.alarmValue) control.addEventListener('change', () => (alarm.hidden = control.value !== f.alarmValue));
        form.append(h('label', { class: 'field', for: id }, h('span', { class: 'field-label' }, f.label), control));
        if (f.alarmValue) form.append(alarm);
      } else if (f.type === 'radio') {
        control = h('fieldset', { class: 'field field-radio' },
          h('legend', { class: 'field-label' }, f.label),
          h('div', { class: 'seg seg-form' }, f.options.map((o, i) => h('label', { class: 'seg-opt' },
            h('input', { type: 'radio', name: f.key, value: o, id: `${id}-${i}` }),
            h('span', {}, o)))));
        form.append(control);
      } else {
        control = f.multiline
          ? h('textarea', { id, name: f.key, rows: 2, placeholder: f.placeholder || '' })
          : h('input', { id, name: f.key, type: f.type === 'date' ? 'date' : 'text', placeholder: f.placeholder || '', value: f.value || '' });
        form.append(h('label', { class: 'field', for: id }, h('span', { class: 'field-label' }, f.label), control));
      }
      fields[f.key] = { f, control };
    });
    form.addEventListener('input', (e) => {
      if (e.isTrusted) exampleFlag.hidden = true;
    });
    form.append(h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Finalizar procedimiento'));
    body.append(form);

    function fill(values, isExample) {
      Object.entries(fields).forEach(([key, { f, control }]) => {
        const v = values[key] ?? '';
        if (f.type === 'radio') control.querySelectorAll('input').forEach((r) => (r.checked = r.value === v));
        else control.value = v;
      });
      alarm.hidden = values.secreciones !== 'Purulenta (signo de alarma)';
      exampleFlag.hidden = !isExample;
      form.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
    this.fillRecord = fill;
  }

  tick(i) {
    this.finalChecks?.[i]?.classList.add('is-done');
  }
}
