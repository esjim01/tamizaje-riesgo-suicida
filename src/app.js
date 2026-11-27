(function () {
  'use strict';

  var I = window.Instruments;
  var S = window.Scoring;
  if (!I || !S) {
    document.body.textContent = 'Error: no se pudieron cargar los instrumentos.';
    return;
  }

  var FREQ_LABELS = { una: 'Una vez', varias: 'Entre 2 y 5 veces', muchas: 'Más de 5 veces', nose: 'No sabría decirlo' };
  var LAST_LABELS = { mes: 'En el último mes', ano: 'Entre 1 y 12 meses', mayor: 'Hace más de un año' };
  var URGE_LABELS = { si: 'Sí', no: 'No', nose: 'No está seguro/a' };

  var LEVEL_COPY = {
    ninguno: {
      text: 'Los instrumentos aplicados no revelaron ideación suicida ni autolesión en este momento. Un tamizaje negativo no descarta riesgo: puede cambiar más adelante.',
      steps: [
        'Si su malestar aparece o aumenta, repita el cuestionario o consulte directamente.',
        'Cuide lo básico: sueño, alimentación, movimiento y contacto con personas de confianza.',
        'Si en algún momento piensa en hacerse daño, busque ayuda ese mismo día.'
      ]
    },
    bajo: {
      text: 'El tamizaje identificó señales de riesgo bajo: hay deseo de muerte o malestar, pero sin intención ni plan. Merece atención y conversación, no alarma.',
      steps: [
        'Cuéntele a una persona de confianza lo que respondió, esta semana.',
        'Solicite una cita de orientación psicológica.',
        'Evite el aislamiento: mantenga contacto con alguien la mayoría de los días.',
        'Si aparece ideación con intención o un plan, pase a la recomendación de riesgo alto.'
      ]
    },
    moderado: {
      text: 'Se identificó ideación suicida con método considerado, o autolesión en los últimos 12 meses sin deseo inmediato. Requiere valoración profesional cercana.',
      steps: [
        'Solicite una valoración de salud mental en los próximos días, no semanas.',
        'Cuéntele a una persona de confianza cómo se está sintiendo.',
        'Acuerde un plan de seguridad sencillo: a quién llamar y qué hacer cuando el malestar sube.',
        'Reduzca el acceso a medicamentos, armas u objetos con los que podría hacerse daño.',
        'No se quede solo en los momentos de mayor malestar.'
      ]
    },
    alto: {
      text: 'Sus respuestas incluyen ideación con intención, un plan, un intento previo o una conducta suicida reciente; o autolesión reciente con deseo actual. Requiere valoración profesional prioritaria.',
      steps: [
        'Busque valoración profesional hoy o mañana (urgencias si el plan avanza).',
        'Pida a alguien de confianza que esté con usted o en contacto continuo.',
        'Entregue temporalmente a otra persona los objetos con los que podría hacerse daño.',
        'No se quede solo y evite el consumo de alcohol u otras sustancias.'
      ]
    },
    inminente: {
      text: 'Reportó pensamientos de suicidio en este momento. Esto requiere atención inmediata: no lo aplace.',
      steps: [
        'Comuníquese ahora con una línea de crisis o acuda a urgencias.',
        'No se quede solo: que alguien esté con usted o en contacto continuo.',
        'Entregue a otra persona cualquier objeto con el que podría hacerse daño.',
        'Diga a una persona de confianza dónde está y cómo se siente.'
      ]
    }
  };

  var els = {
    intro: document.getElementById('intro-view'),
    consentForm: document.getElementById('consent-form'),
    consent: document.getElementById('consent'),
    startBtn: document.getElementById('start-btn'),
    formView: document.getElementById('form-view'),
    form: document.getElementById('risk-form'),
    asqBody: document.getElementById('asq-body'),
    stepCssrs: document.getElementById('step-cssrs'),
    cssrsBody: document.getElementById('cssrs-body'),
    shBody: document.getElementById('sh-body'),
    shFollow: document.getElementById('sh-follow'),
    shFollowBody: document.getElementById('sh-follow-body'),
    craWrap: document.getElementById('cra-wrap'),
    craBody: document.getElementById('cra-body'),
    error: document.getElementById('form-error'),
    progress: document.getElementById('progress'),
    progressText: document.getElementById('progress-text'),
    progressPct: document.getElementById('progress-pct'),
    resultView: document.getElementById('result-view'),
    critical: document.getElementById('result-critical'),
    criticalText: document.getElementById('critical-text'),
    levelCard: document.getElementById('level-card'),
    levelTitle: document.getElementById('level-title'),
    levelChips: document.getElementById('level-chips'),
    levelText: document.getElementById('level-text'),
    criteria: document.getElementById('criteria-list'),
    steps: document.getElementById('level-steps'),
    shCard: document.getElementById('sh-card'),
    shSummary: document.getElementById('sh-summary'),
    shDetail: document.getElementById('sh-detail'),
    craNote: document.getElementById('cra-note')
  };

  function esc(text) {
    return String(text).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function optionsMarkup() {
    return Array.prototype.slice.call(arguments).map(function (option) {
      return '<label class="opt">' +
        '<input type="radio" name="' + option.name + '" value="' + option.value + '"' +
        ' aria-label="' + esc(option.aria || option.label) + '">' +
        '<span class="box"><span class="num">' + esc(option.short || option.label) + '</span>' +
        (option.caption ? '<span class="anchor">' + esc(option.caption) + '</span>' : '') +
        '</span></label>';
    }).join('');
  }

  function fieldset(item, columns, inner) {
    return '<fieldset class="item" data-item="' + item.id + '">' +
      '<legend>' + esc(item.text) + '</legend>' +
      '<div class="scale scale--' + columns + '">' + inner + '</div>' +
      '</fieldset>';
  }

  function yesNoItem(item) {
    return fieldset(item, 2, optionsMarkup(
      { name: item.id, value: 'si', label: 'Sí' },
      { name: item.id, value: 'no', label: 'No' }
    ));
  }

  function choiceItem(item) {
    return fieldset(item, item.options.length, item.options.map(function (option) {
      return { name: item.id, value: option.value, label: option.label };
    }).reduce(function (html, option) {
      return html + optionsMarkup(option);
    }, ''));
  }

  function craItem(item) {
    return fieldset(item, 5, I.CRA_SCALE.map(function (label, value) {
      return {
        name: item.id,
        value: String(value),
        label: label,
        short: String(value),
        aria: value + ' — ' + label,
        caption: value === 0 ? 'Nunca' : value === 4 ? 'Siempre' : ''
      };
    }).reduce(function (html, option) {
      return html + optionsMarkup(option);
    }, ''));
  }

  function buildForm() {
    els.asqBody.innerHTML = I.ASQ.map(yesNoItem).join('');
    els.cssrsBody.innerHTML = I.CSSRS.map(function (item) {
      return item.type === 'choice' ? choiceItem(item) : yesNoItem(item);
    }).join('');
    els.shBody.innerHTML = yesNoItem(I.SELFHARM.gate);
    els.shFollowBody.innerHTML = I.SELFHARM.follow.map(function (item) {
      return item.type === 'choice' ? choiceItem(item) : yesNoItem(item);
    }).join('');
    els.craBody.innerHTML = I.CRA.map(craItem).join('');
  }

  function readAnswers() {
    var answers = {};
    els.form.querySelectorAll('input[type="radio"]:checked').forEach(function (input) {
      answers[input.name] = input.value;
    });
    return answers;
  }

  function clearSection(container) {
    container.querySelectorAll('input[type="radio"]').forEach(function (input) {
      input.checked = false;
    });
  }

  function refreshGates() {
    var answers = readAnswers();
    var asqPositive = S.asqScore(answers).positive;
    var cssrsOn = S.cssrsRequired(answers);
    var shOn = S.selfharmScore(answers).reported;

    var asq5 = els.form.querySelector('[data-item="asq5"]');
    if (asq5) {
      asq5.hidden = !asqPositive;
      if (!asqPositive) clearSection(asq5);
    }
    els.stepCssrs.hidden = !cssrsOn;
    els.shFollow.hidden = !shOn;
    els.craWrap.hidden = !shOn;
    if (!cssrsOn) clearSection(els.cssrsBody);
    if (!shOn) {
      clearSection(els.shFollowBody);
      clearSection(els.craBody);
    }

    var required = S.requiredIds(answers);
    var answered = required.filter(function (id) { return answers[id] !== undefined; }).length;
    els.progress.max = required.length;
    els.progress.value = answered;
    els.progressText.textContent = answered + ' de ' + required.length + ' respondidas';
    els.progressPct.textContent = Math.round((answered / required.length) * 100) + '%';
  }

  function markMissing(missing) {
    els.form.querySelectorAll('.item').forEach(function (fieldset) {
      fieldset.classList.toggle('is-missing', missing.indexOf(fieldset.dataset.item) !== -1);
    });
  }

  function renderResult(result) {
    var copy = LEVEL_COPY[result.level.key];

    els.critical.hidden = !result.critical;
    if (result.critical) {
      var unique = [];
      result.reasons.forEach(function (reason) {
        if (unique.indexOf(reason.text) === -1) unique.push(reason.text);
      });
      els.criticalText.textContent = 'Sus respuestas incluyen: ' + unique.join('; ') +
        '. Estas señales no deben manejarse en soledad.';
    }

    els.levelCard.className = 'card level ' + result.level.key;
    els.levelTitle.textContent = result.level.label;
    els.levelText.textContent = copy.text;

    var chips = [
      'ASQ: ' + result.asqOrder.label,
      result.cssrsApplied ? 'C-SSRS: ' + S.LEVELS[result.cssrs.level].label : 'C-SSRS: no aplicado',
      'Autolesión: ' + result.selfharm.status.label
    ];
    els.levelChips.innerHTML = chips.map(function (chip) {
      return '<span class="chip">' + esc(chip) + '</span>';
    }).join('');

    els.criteria.innerHTML = result.reasons.length
      ? result.reasons.map(function (reason) {
        return '<li><span class="tag">' + esc(reason.module) + '</span> ' + esc(reason.text) + '</li>';
      }).join('')
      : '<li>No se registraron criterios afirmativos en los instrumentos aplicados.</li>';

    var steps = copy.steps.slice();
    if (result.critical && result.level.key !== 'inminente') {
      steps.unshift('No se quede solo: pida a una persona de confianza que esté con usted o le llame pronto.');
    }
    els.steps.innerHTML = steps.map(function (step) {
      return '<li>' + esc(step) + '</li>';
    }).join('');

    els.shCard.hidden = !result.selfharm.reported;
    if (result.selfharm.reported) {
      els.shSummary.textContent = result.selfharm.status.label +
        (result.selfharm.urge ? ' · deseo actual de hacerse daño' : '');
      var rows = [
        ['Frecuencia', FREQ_LABELS[result.selfharm.frecuencia] || '—'],
        ['Última vez', LAST_LABELS[result.selfharm.ultima] || '—'],
        ['Atención médica', result.selfharm.medical ? 'Sí' : 'No'],
        ['Deseo actual', URGE_LABELS[result.selfharm.urge ? 'si' : 'no'] || '—']
      ];
      els.shDetail.innerHTML = rows.map(function (row) {
        return '<div class="dim-row"><div class="dim-head"><span>' + esc(row[0]) + '</span>' +
          '<span>' + esc(row[1]) + '</span></div></div>';
      }).join('');
      if (result.cra) {
        els.craNote.hidden = false;
        els.craNote.textContent = 'Índice CRA: ' + result.cra.total + ' de ' + result.cra.max +
          ' · ' + result.cra.highCount + ' de ' + I.CRA.length +
          ' reactivos respondidos con frecuencia alta (≥ 3). El CRA no publica punto de corte: este índice se interpreta con un profesional y no cambia por sí solo el nivel asignado.';
      } else {
        els.craNote.hidden = true;
      }
    } else {
      els.shSummary.textContent = '';
      els.shDetail.innerHTML = '';
      els.craNote.hidden = true;
    }

    els.formView.hidden = true;
    els.resultView.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  els.consent.addEventListener('change', function () {
    els.startBtn.disabled = !els.consent.checked;
  });

  els.consentForm.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!els.consent.checked) return;
    els.intro.hidden = true;
    els.formView.hidden = false;
    refreshGates();
    window.scrollTo({ top: 0 });
    var first = els.form.querySelector('input[type="radio"]');
    if (first) first.focus({ preventScroll: true });
  });

  els.form.addEventListener('change', function () {
    if (els.form.querySelector('.is-missing')) {
      els.form.querySelectorAll('.is-missing').forEach(function (el) {
        el.classList.remove('is-missing');
      });
      els.error.hidden = true;
    }
    refreshGates();
  });

  els.form.addEventListener('submit', function (event) {
    event.preventDefault();
    var result = S.evaluate(readAnswers());
    if (!result.ok) {
      markMissing(result.missing);
      els.error.hidden = false;
      els.error.textContent = 'Faltan ' + result.missing.length + ' pregunta' +
        (result.missing.length === 1 ? '' : 's') + ' por responder. Complete las marcadas.';
      var first = els.form.querySelector('.item.is-missing');
      if (first) {
        first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var radio = first.querySelector('input[type="radio"]');
        if (radio) radio.focus({ preventScroll: true });
      }
      return;
    }
    els.error.hidden = true;
    renderResult(result);
  });

  document.getElementById('back-btn').addEventListener('click', function () {
    els.resultView.hidden = true;
    els.formView.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('print-btn').addEventListener('click', function () {
    window.print();
  });

  document.getElementById('restart-btn').addEventListener('click', function () {
    els.form.reset();
    els.form.querySelectorAll('.is-missing').forEach(function (el) { el.classList.remove('is-missing'); });
    els.error.hidden = true;
    refreshGates();
    els.resultView.hidden = true;
    els.intro.hidden = false;
    els.consent.checked = false;
    els.startBtn.disabled = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  buildForm();
  refreshGates();
})();
