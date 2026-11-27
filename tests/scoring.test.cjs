// node --test "tests/*.test.cjs"
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../src/instruments.js');
const S = require('../src/scoring.js');

const ASQ_NO = { asq1: 'no', asq2: 'no', asq3: 'no', asq4: 'no' };
const CSSRS_NO = { css1: 'no', css2: 'no', css3: 'no', css4: 'no', css5: 'no', css6: 'nunca' };
const craFill = (value) => Object.fromEntries(I.CRA.map((it) => [it.id, String(value)]));
const FOLLOW = { sh_frecuencia: 'varias', sh_ultima: 'mes', sh_medica: 'no', sh_deseo: 'no' };
const full = (over = {}) => ({ ...ASQ_NO, asq5: 'no', ...CSSRS_NO, sh_conducta: 'no', ...over });

test('instrumentos transcritos: ASQ 5, C-SSRS 6, CRA 37', () => {
  assert.equal(I.ASQ.length, 5);
  assert.equal(I.CSSRS.length, 6);
  assert.equal(I.CRA.length, 37);
  assert.equal(I.CRA_MAX, 148);
});

test('sin respuestas: reporta las 5 preguntas obligatorias del primer paso', () => {
  const missing = S.missingIds({});
  assert.deepEqual(missing, ['asq1', 'asq2', 'asq3', 'asq4', 'sh_conducta']);
});

test('ASQ negativo: sin riesgo y C-SSRS no aplicado', () => {
  const r = S.evaluate(full());
  assert.equal(r.ok, true);
  assert.equal(r.asq.order, 0);
  assert.equal(r.cssrsApplied, false);
  assert.equal(r.suicideLevel, 0);
  assert.equal(r.overallLevel, 0);
  assert.equal(r.critical, false);
});

test('ASQ positivo habilita el C-SSRS y exige sus 6 respuestas', () => {
  const answers = { ...full(), asq1: 'si' };
  assert.equal(S.cssrsRequired(answers), true);
  const missing = S.missingIds({ ...ASQ_NO, sh_conducta: 'no', asq1: 'si' });
  assert.equal(missing.length, 7);
  assert.equal(missing.filter((id) => id.startsWith('css')).length, 6);
  assert.equal(missing.includes('asq5'), true);
});

test('reglas MODORIS del ASQ: 1/2 -> bajo, 3 -> moderado, 4 -> alto, 5 -> inminente', () => {
  assert.equal(S.asqScore({ ...ASQ_NO, asq1: 'si' }).order, 1);
  assert.equal(S.asqScore({ ...ASQ_NO, asq2: 'si' }).order, 1);
  assert.equal(S.asqScore({ ...ASQ_NO, asq3: 'si' }).order, 2);
  assert.equal(S.asqScore({ ...ASQ_NO, asq4: 'si' }).order, 3);
  assert.equal(S.asqScore({ ...ASQ_NO, asq3: 'si', asq5: 'si' }).order, 4);
});

test('C-SSRS: deseo y pensamiento = bajo; método = moderado; intención, plan o conducta reciente = alto', () => {
  assert.equal(S.cssrsScore({ ...CSSRS_NO, css1: 'si' }).level, 1);
  assert.equal(S.cssrsScore({ ...CSSRS_NO, css3: 'si' }).level, 2);
  assert.equal(S.cssrsScore({ ...CSSRS_NO, css4: 'si' }).level, 3);
  assert.equal(S.cssrsScore({ ...CSSRS_NO, css5: 'si' }).level, 3);
  assert.equal(S.cssrsScore({ ...CSSRS_NO, css6: 'reciente' }).level, 3);
  assert.equal(S.cssrsScore({ ...CSSRS_NO, css6: 'antigua' }).level, 2);
});

test('el nivel suicida es el máximo entre ASQ y C-SSRS', () => {
  const r = S.evaluate(full({ asq3: 'si', css5: 'si' }));
  assert.equal(r.asq.order, 2);
  assert.equal(r.cssrsApplied, true);
  assert.equal(r.cssrs.level, 3);
  assert.equal(r.suicideLevel, 3);
  assert.equal(r.level.key, 'alto');
  assert.equal(r.critical, true);
});

test('pensamientos de suicidio en este momento: inminente', () => {
  const r = S.evaluate(full({ asq1: 'si', asq5: 'si' }));
  assert.equal(r.asq.order, 4);
  assert.equal(r.level.key, 'inminente');
  assert.equal(r.critical, true);
});

test('intento previo de suicidio (ASQ 4) = riesgo alto', () => {
  const r = S.evaluate(full({ asq4: 'si' }));
  assert.equal(r.level.key, 'alto');
  assert.equal(r.critical, true);
});

test('autolesión no reportada: no se exige el CRA ni el detalle', () => {
  const answers = full({ sh_conducta: 'no' });
  const required = S.requiredIds(answers);
  assert.equal(required.includes('sh_frecuencia'), false);
  assert.equal(required.includes('cra1'), false);
  assert.equal(S.selfharmScore(answers).reported, false);
  assert.equal(S.craRequired(answers), false);
});

test('autolesión reportada exige detalle y los 37 reactivos del CRA', () => {
  const answers = { ...full(), sh_conducta: 'si' };
  const required = S.requiredIds(answers);
  assert.equal(required.includes('sh_frecuencia'), true);
  assert.equal(required.filter((id) => id.startsWith('cra')).length, 37);
  assert.equal(S.evaluate(answers).ok, false);
});

test('recencia de la autolesión define el nivel: pasada, 12 meses o último mes', () => {
  const past = S.selfharmScore({ sh_conducta: 'si', sh_ultima: 'mayor', sh_deseo: 'no' });
  const recent = S.selfharmScore({ sh_conducta: 'si', sh_ultima: 'ano', sh_deseo: 'no' });
  const current = S.selfharmScore({ sh_conducta: 'si', sh_ultima: 'mes', sh_deseo: 'no' });
  assert.equal(past.level, 1);
  assert.equal(recent.level, 2);
  assert.equal(current.level, 3);
});

test('deseo actual de hacerse daño eleva el nivel aunque la autolesión sea antigua', () => {
  const answers = full({ sh_conducta: 'si', ...FOLLOW, sh_ultima: 'mayor', sh_deseo: 'si', ...craFill(0) });
  const r = S.evaluate(answers);
  assert.equal(r.ok, true);
  assert.equal(r.selfharm.level, 3);
  assert.equal(r.level.key, 'alto');
  assert.equal(r.critical, true);
});

test('el CRA se reporta como índice y no cambia el nivel por sí solo', () => {
  const answers = full({ sh_conducta: 'si', sh_frecuencia: 'una', sh_ultima: 'mayor', sh_medica: 'no', sh_deseo: 'no', ...craFill(4) });
  const r = S.evaluate(answers);
  assert.equal(r.cra.total, 148);
  assert.equal(r.cra.highCount, 37);
  assert.equal(r.level.key, 'bajo');
});

test('índice CRA suma los 37 reactivos en escala 0-4', () => {
  const answers = { ...craFill(2), cra1: '4', cra2: '0' };
  assert.equal(S.craScore(answers).total, 2 * 35 + 4);
  assert.equal(S.craScore(answers).highCount, 1);
});

test('la alerta crítica se activa con conducta suicida reciente', () => {
  const r = S.evaluate(full({ asq1: 'si', css6: 'reciente' }));
  assert.equal(r.critical, true);
  assert.equal(r.level.key, 'alto');
});

test('los criterios del resultado citan el instrumento que los originó', () => {
  const r = S.evaluate(full({ asq3: 'si', css5: 'si' }));
  const modules = r.reasons.map((reason) => reason.module);
  assert.ok(modules.includes('ASQ'));
  assert.ok(modules.includes('C-SSRS'));
});
