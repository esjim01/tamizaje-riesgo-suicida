/* Lógica de puntaje: aplica las reglas publicadas de cada instrumento.
   No se inventan puntos de corte: los niveles provienen de las reglas de ASQ
   (MODORIS), del triage del C-SSRS y de la indagación directa de autolesión.
   El CRA se reporta como índice descriptivo (no publica punto de corte). */
(function (root) {
  'use strict';

  var I = root.Instruments || (typeof require === 'function' ? require('./instruments.js') : null);
  if (!I) throw new Error('Faltan los instrumentos');

  var LEVELS = [
    { key: 'ninguno', label: 'Sin señales de riesgo' },
    { key: 'bajo', label: 'Riesgo bajo' },
    { key: 'moderado', label: 'Riesgo moderado' },
    { key: 'alto', label: 'Riesgo alto' },
    { key: 'inminente', label: 'Riesgo inminente' }
  ];

  var ASQ_ORDERS = [
    { key: 'ninguno', label: 'Sin tamizaje positivo' },
    { key: 'bajo', label: 'Primer orden (bajo)' },
    { key: 'moderado', label: 'Segundo orden (moderado)' },
    { key: 'alto', label: 'Tercer orden (alto)' },
    { key: 'inminente', label: 'Cuarto orden (inminente)' }
  ];

  var SELFHARM_STATUS = {
    none: { key: 'none', label: 'Sin autolesión reportada', level: 0 },
    past: { key: 'past', label: 'Autolesión pasada (hace más de un año)', level: 1 },
    recent: { key: 'recent', label: 'Autolesión en los últimos 12 meses', level: 2 },
    current: { key: 'current', label: 'Autolesión en el último mes', level: 3 }
  };

  var CRITERIA = {
    asq1: 'deseo de estar muerto en las últimas semanas',
    asq2: 'sentir que su familia estaría mejor si estuviera muerto',
    asq3: 'pensamientos de suicidio en la última semana',
    asq4: 'intento de suicidio previo',
    asq5: 'pensamientos de suicidio en este momento',
    css1: 'deseo de muerte en el último mes',
    css2: 'pensamientos de matarse en el último mes',
    css3: 'ideación con método, sin intención',
    css4: 'ideación con intención de actuar',
    css5: 'plan detallado con intención',
    css6: 'conducta suicida'
  };

  function isSi(value) {
    return value === 'si';
  }

  function answersOf(ids, answers) {
    return ids.map(function (id) { return answers[id]; });
  }

  function complete(ids, answers) {
    return ids.every(function (id) {
      return answers[id] !== undefined && answers[id] !== '';
    });
  }

  // ---- ASQ (reglas MODORIS) ----
  function asqScore(answers) {
    var acute = isSi(answers.asq5);
    var positives = ['asq1', 'asq2', 'asq3', 'asq4', 'asq5'].filter(function (id) {
      return isSi(answers[id]);
    });
    var order = 0;
    if (acute) order = 4;
    else if (isSi(answers.asq4)) order = 3;
    else if (isSi(answers.asq3)) order = 2;
    else if (isSi(answers.asq1) || isSi(answers.asq2)) order = 1;

    return {
      order: order,
      positive: ['asq1', 'asq2', 'asq3', 'asq4'].some(function (id) { return isSi(answers[id]); }),
      acute: acute,
      positives: positives
    };
  }

  function cssrsRequired(answers) {
    return asqScore(answers).positive;
  }

  // ---- C-SSRS versión de cribado (triage publicado) ----
  function cssrsScore(answers) {
    var points = ['css1', 'css2', 'css3', 'css4', 'css5', 'css6'].filter(function (id) {
      var value = answers[id];
      return id === 'css6' ? value === 'antigua' || value === 'reciente' : isSi(value);
    });
    var level = 0;
    if (isSi(answers.css4) || isSi(answers.css5) || answers.css6 === 'reciente') level = 3;
    else if (isSi(answers.css3) || answers.css6 === 'antigua') level = 2;
    else if (isSi(answers.css1) || isSi(answers.css2)) level = 1;
    return { level: level, positives: points };
  }

  // ---- Autolesión: indagación directa ----
  function selfharmScore(answers) {
    if (!isSi(answers.sh_conducta)) {
      return { reported: false, status: SELFHARM_STATUS.none, level: 0, urge: false, medical: false, positives: [] };
    }
    var status = answers.sh_ultima === 'mes'
      ? SELFHARM_STATUS.current
      : answers.sh_ultima === 'ano'
        ? SELFHARM_STATUS.recent
        : SELFHARM_STATUS.past;
    var urge = answers.sh_deseo === 'si';
    var medical = answers.sh_medica === 'si';
    var level = urge ? 3 : status.level;
    var positives = ['sh_conducta'].concat(
      ['sh_frecuencia', 'sh_ultima', 'sh_medica', 'sh_deseo'].filter(function (id) {
        return answers[id] !== undefined && answers[id] !== 'no';
      })
    );
    return {
      reported: true,
      status: status,
      level: level,
      urge: urge,
      medical: medical,
      frecuencia: answers.sh_frecuencia,
      ultima: answers.sh_ultima,
      positives: positives
    };
  }

  // ---- CRA: índice descriptivo, sin punto de corte inventado ----
  function craRequired(answers) {
    return isSi(answers.sh_conducta);
  }

  function craScore(answers) {
    var total = 0;
    var highCount = 0;
    I.CRA.forEach(function (item) {
      var value = Number(answers[item.id]);
      if (!Number.isNaN(value)) {
        total += value;
        if (value >= 3) highCount += 1;
      }
    });
    return { total: total, max: I.CRA_MAX, highCount: highCount };
  }

  // ---- Elementos visibles/obligatorios según las compuertas ----
  function requiredIds(answers) {
    var ids = I.ASQ.filter(function (item) { return !item.acuity; }).map(function (item) { return item.id; });
    if (asqScore(answers).positive) ids = ids.concat(['asq5']);
    if (cssrsRequired(answers)) ids = ids.concat(I.CSSRS.map(function (item) { return item.id; }));
    ids = ids.concat(['sh_conducta']);
    if (selfharmScore(answers).reported) {
      ids = ids.concat(I.SELFHARM.follow.map(function (item) { return item.id; }));
      ids = ids.concat(I.CRA.map(function (item) { return item.id; }));
    }
    return ids;
  }

  function missingIds(answers) {
    return requiredIds(answers).filter(function (id) {
      return answers[id] === undefined || answers[id] === '';
    });
  }

  function buildReasons(answers, asq, cssrs, selfharm) {
    var reasons = [];
    asq.positives.forEach(function (id) {
      reasons.push({ module: 'ASQ', text: CRITERIA[id] });
    });
    if (cssrsRequired(answers)) {
      cssrs.positives.forEach(function (id) {
        reasons.push({ module: 'C-SSRS', text: CRITERIA[id] });
      });
    }
    if (selfharm.reported) {
      reasons.push({ module: 'Autolesión', text: 'reportó ' + selfharm.status.label.toLowerCase() });
      if (selfharm.medical) reasons.push({ module: 'Autolesión', text: 'requirió atención médica' });
      if (selfharm.urge) reasons.push({ module: 'Autolesión', text: 'deseo o necesidad actual de hacerse daño' });
    }
    return reasons;
  }

  function evaluate(answers) {
    answers = answers || {};
    var missing = missingIds(answers);
    if (missing.length) return { ok: false, missing: missing };

    var asq = asqScore(answers);
    var cssrs = cssrsRequired(answers) ? cssrsScore(answers) : { level: 0, positives: [], applied: false };
    if (cssrsRequired(answers)) cssrs.applied = true;
    var selfharm = selfharmScore(answers);
    var cra = craRequired(answers) ? craScore(answers) : null;

    var suicideLevel = Math.max(asq.order, cssrs.level);
    var overallLevel = Math.max(suicideLevel, selfharm.level);
    var critical = suicideLevel >= 3 || (selfharm.reported && selfharm.urge);

    return {
      ok: true,
      asq: asq,
      asqOrder: ASQ_ORDERS[asq.order],
      cssrs: cssrs,
      cssrsApplied: asq.positive,
      selfharm: selfharm,
      cra: cra,
      suicideLevel: suicideLevel,
      suicideLevelInfo: LEVELS[suicideLevel],
      overallLevel: overallLevel,
      level: LEVELS[overallLevel],
      critical: critical,
      reasons: buildReasons(answers, asq, cssrs, selfharm)
    };
  }

  var api = {
    LEVELS: LEVELS,
    ASQ_ORDERS: ASQ_ORDERS,
    SELFHARM_STATUS: SELFHARM_STATUS,
    asqScore: asqScore,
    cssrsScore: cssrsScore,
    cssrsRequired: cssrsRequired,
    selfharmScore: selfharmScore,
    craScore: craScore,
    craRequired: craRequired,
    requiredIds: requiredIds,
    missingIds: missingIds,
    evaluate: evaluate
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.Scoring = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
