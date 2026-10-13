import { h, clear, pad2 } from './dom.js';
import { icon } from './icons.js';
import { INSTRUMENTS } from '../data/instruments.js';
import { STAGES, APP_TEXT } from '../data/stages.js';

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

    const card = h('section', { class: 'step-card', 'aria-live': 'polite' },
      h('div', { class: 'step-meta' }, h('span', { class: 'step-id' }, step.id), h('span', { class: 'step-count' }, `Paso ${stepIdx + 1} de ${steps.length}`)),
      h('h2', { class: 'step-title' }, step.title),
      step.text ? h('p', { class: 'step-text' }, step.text) : null,
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

  renderRecord(body, step) {
    body.append(h('h3', { class: 'block-title' }, 'Lista de verificación'));
    this.finalChecks = step.checklist.map((t) => h('li', {}, h('span', { class: 'tick', html: icon('check') }), h('span', {}, t)));
    body.append(h('ul', { class: 'final-checklist' }, this.finalChecks));
    body.append(h('h3', { class: 'block-title' }, 'Registro del procedimiento'));
    const form = h('form', { class: 'record-form', onsubmit: (e) => { e.preventDefault(); this.handlers.finish(); } });
    step.form.forEach((f) => {
      const id = 'f-' + f.key;
      const input = f.multiline
        ? h('textarea', { id, name: f.key, rows: 2, placeholder: f.placeholder || '' })
        : h('input', { id, name: f.key, type: 'text', placeholder: f.placeholder || '', value: f.value || '' });
      if (f.multiline && f.value) input.value = f.value;
      form.append(h('label', { class: 'field', for: id }, h('span', { class: 'field-label' }, f.label), input));
    });
    form.append(h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Finalizar procedimiento'));
    body.append(form);
  }

  tick(i) {
    this.finalChecks?.[i]?.classList.add('is-done');
  }
}
