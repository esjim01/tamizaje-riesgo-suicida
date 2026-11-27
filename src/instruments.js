/* Instrumentos reales, transcritos de sus fuentes:
   - ASQ MODORIS (Secretaría de Salud de México, adaptación del Ask Suicide-Screening
     Questions del NIMH).
   - C-SSRS versión de cribado (Columbia-Suicide Severity Rating Scale, Posner et al., 2011).
   - CRA (Cuestionario de Riesgo de Autolesión, Herrera et al., 2021; validado en Colombia).
   - Preguntas directas de autolesión: indagación recomendada por NICE NG225 / criterios NSSI del DSM-5. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.Instruments = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ---- 1. ASQ (5 preguntas, sí/no). La 5 se aplica solo si hay algún sí previo. ----
  var ASQ = [
    { id: 'asq1', text: 'En las últimas semanas, ¿ha deseado estar muerto?' },
    { id: 'asq2', text: 'En las últimas semanas, ¿ha sentido que usted o su familia estarían mejor si estuviera muerto?' },
    { id: 'asq3', text: 'En la última semana, ¿ha pensado en suicidarse?' },
    { id: 'asq4', text: '¿Alguna vez ha intentado suicidarse?' },
    { id: 'asq5', text: '¿Está pensando en suicidarse en este momento?', acuity: true }
  ];

  // ---- 2. C-SSRS versión de cribado: ideación del último mes + conducta. ----
  var CSSRS = [
    { id: 'css1', text: '¿Ha deseado estar muerto o poder dormirse y no despertar?' },
    { id: 'css2', text: '¿Ha tenido pensamientos de matarse?' },
    { id: 'css3', text: '¿Ha pensado en cómo podría hacerlo (algún método)?' },
    { id: 'css4', text: '¿Ha tenido estos pensamientos y alguna intención de llevarlos a cabo?' },
    { id: 'css5', text: '¿Ha empezado a elaborar o ya tiene un plan detallado para suicidarse, con intención de cumplirlo?' },
    {
      id: 'css6',
      text: '¿Alguna vez ha hecho algo, empezado a hacer algo o se ha preparado para terminar con su vida?',
      type: 'choice',
      options: [
        { value: 'nunca', label: 'No, nunca' },
        { value: 'antigua', label: 'Sí, pero no en los últimos 3 meses' },
        { value: 'reciente', label: 'Sí, en los últimos 3 meses' }
      ]
    }
  ];

  // ---- 3. Autolesión: indagación directa (NICE NG225). ----
  var SELFHARM = {
    gate: { id: 'sh_conducta', text: '¿Alguna vez se ha hecho daño a propósito sin intención de quitarse la vida (por ejemplo: cortarse, golpearse, quemarse, rasparse o morderse)?' },
    follow: [
      {
        id: 'sh_frecuencia',
        text: '¿Cuántas veces lo ha hecho?',
        type: 'choice',
        options: [
          { value: 'una', label: 'Una vez' },
          { value: 'varias', label: 'Entre 2 y 5 veces' },
          { value: 'muchas', label: 'Más de 5 veces' },
          { value: 'nose', label: 'No sabría decirlo' }
        ]
      },
      {
        id: 'sh_ultima',
        text: '¿Cuándo fue la última vez?',
        type: 'choice',
        options: [
          { value: 'mes', label: 'En el último mes' },
          { value: 'ano', label: 'Entre 1 y 12 meses' },
          { value: 'mayor', label: 'Hace más de un año' }
        ]
      },
      { id: 'sh_medica', text: '¿Ha necesitado atención médica (curación, sutura, urgencias) por esas lesiones?' },
      {
        id: 'sh_deseo',
        text: '¿Siente ahora el deseo o la necesidad de hacerse daño?',
        type: 'choice',
        options: [
          { value: 'si', label: 'Sí' },
          { value: 'no', label: 'No' },
          { value: 'nose', label: 'No estoy seguro/a' }
        ]
      }
    ]
  };

  // ---- 4. CRA: 37 ítems, escala 0-4 (Herrera López et al., 2021). ----
  var CRA = [
    'Cuando me hago daño es para dejar de sentirme triste y sin esperanza.',
    'Hacerme daño me ayuda a calmar la ira que siento por no poder solucionar mis dificultades.',
    'Lastimarme me ayuda a escapar de mis problemas.',
    'Me lastimo para poder sobrellevar mis problemas.',
    'Cuando me hago daño disminuyo mi estrés.',
    'Necesito lastimarme cuando siento que mi espíritu se desprende de mi cuerpo.',
    'Cuando me lastimo lo hago para evitar que mi cuerpo se separe.',
    'Me hago daño para dejar de tener la sensación de que lo que me rodea no es real.',
    'Me lastimo para callar las voces que escucho en mi cabeza.',
    'Cuando me hago daño disminuye el hormigueo de alguna parte de mi cuerpo.',
    'Cuando veo cosas que no existen, lastimarme me trae nuevamente a la realidad.',
    'Me he hecho daño para evitar tener pensamientos de muerte.',
    'Necesito autolesionarme con el fin de evadir pensamientos suicidas.',
    'Me autolesiono para no llevar a cabo el plan que tengo de quitarme la vida.',
    'Cuando alguien me comenta que ha pensado en el suicidio, le digo que lastimarse distrae de ese tipo de pensamiento.',
    'Me autolesiono porque en realidad no sería capaz de quitarme la vida.',
    'Si a otros les ha servido lastimarse para sentirse mejor, puede funcionar conmigo.',
    'Alguien me aconsejó autolesionarme.',
    'Me he autolesionado porque he visto a alguien cercano hacerlo.',
    'Hacerme daño sirve para conseguir la atención de alguien.',
    'Está bien autolesionarme cuando tengo problemas con mis amigos.',
    'Está bien autolesionarme cuando tengo problemas con mi familia.',
    'Cuando tengo problemas con mi pareja está bien autolesionarme.',
    'Lastimarme me hace sentir diferente frente a los demás.',
    'Me hago daño intencionalmente para sentir control de mí mismo.',
    'Necesito lastimarme para dejar de sentir que dependo de otra persona.',
    'Autolesionarse me sirve para forjar un carácter fuerte.',
    'Me lastimo para no sentirme culpable.',
    'Cuando me lastimo, lo hago para cambiar algún comportamiento que no me gusta de mí.',
    'Cuando cometo errores, es necesario autolesionarme.',
    'Lastimarme me ayuda a formarme como mejor persona.',
    'Me hago daño para no perder el control de las situaciones.',
    'Considero que autolesionarme me genera placer.',
    'Experimento emociones intensas cuando me autolesiono.',
    'Me hago daño sin medir el riesgo, con el fin de experimentar nuevas sensaciones.',
    'Me autolesiono para sentirme vivo/a.',
    'Autolesionarme a pesar de los riesgos, me ayuda a aprender cosas nuevas.'
  ].map(function (text, index) {
    return { id: 'cra' + (index + 1), text: text, index: index };
  });

  var CRA_SCALE = ['Nunca', 'Casi nunca', 'Algunas veces', 'Casi siempre', 'Siempre'];

  return {
    ASQ: ASQ,
    CSSRS: CSSRS,
    SELFHARM: SELFHARM,
    CRA: CRA,
    CRA_SCALE: CRA_SCALE,
    CRA_MAX: CRA.length * 4
  };
});
