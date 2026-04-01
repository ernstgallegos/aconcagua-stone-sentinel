export function buildHelpSections(uiText, t) {
  const pressureRows = [
    [uiText('Low', 'Baja'), uiText('Wide tactical air. Move with confidence, but keep one eye on water and the clock.', 'Tenés margen táctico amplio. Avanzá con confianza, pero no sueltes el reloj ni la hidratación.')],
    [uiText('Manageable', 'Manejable'), uiText('You can still push if your body trend stays tidy and confidence doesn’t wobble.', 'Podés empujar todavía si la tendencia corporal se mantiene prolija y la confianza no tambalea.')],
    [uiText('Severe', 'Severa'), uiText('Margin gets tight here. Slow down, map a retreat window before you need it.', 'Acá el margen se afina. Bajá un cambio y dejá planificada la retirada antes de necesitarla.')],
    [uiText('Very Severe', 'Muy severa'), uiText('Attrition risk spikes. Advance only when body state is solid and the signal feels clean.', 'El riesgo de desgaste se dispara. Avanzá solo con estado corporal sólido y señal limpia.')],
    [uiText('Extreme', 'Extrema'), uiText('The system is close to saying ‘no’. Preservation and descent logic should take over.', 'El sistema está al borde del “no”. Acá manda preservar y pensar en descenso.')],
  ];

  const trendRows = [
    [uiText('Easing', 'Mejorando'), uiText('Pressure is easing off. Confirm the read, then commit to longer pushes.', 'La presión afloja. Confirmá lectura y recién ahí comprometé avances largos.')],
    [uiText('Steady', 'Estable'), uiText('Conditions are sticky. Stay disciplined with resources and don’t get cocky.', 'Las condiciones vienen pegajosas. Cuidá recursos y no te agrandes.')],
    [uiText('Worsening', 'Empeorando'), uiText('Risk is climbing. Trim aggression and protect descent options.', 'El riesgo viene subiendo. Bajá agresividad y protegé opciones de descenso.')],
    [uiText('Worsening fast', 'Empeorando rápido'), uiText('Instability is accelerating. Trade altitude for survival margin, no heroics.', 'La inestabilidad acelera. Cambiá altura por margen de supervivencia, sin heroísmos.')],
    [uiText('Uncertain', 'Incierta'), uiText('Signal quality is muddy. Favor robust, low-exposure actions.', 'La señal está turbia. Priorizá acciones robustas y de baja exposición.')],
  ];

  const confidenceRows = [
    [uiText('High confidence', 'Alta confianza'), uiText('Your read is coherent, not magic. Keep checking trend against body drift.', 'Tu lectura está bien, pero no es magia. Seguí chequeando tendencia contra deriva corporal.')],
    [uiText('Medium confidence', 'Confianza media'), uiText('Signals are usable—carefully. Avoid chaining expensive actions back to back.', 'Las señales sirven, con cuidado. Evitá encadenar acciones caras una tras otra.')],
    [uiText('Low confidence', 'Baja confianza'), uiText('Interpretation range is wide. Pick robust options and keep retreat pacing ready.', 'El rango de interpretación se abre mucho. Elegí opciones robustas y ritmo listo para retirada.')],
  ];

  const readGameBullets = [
    uiText('Read trend before impulse.', 'Lee la tendencia antes del impulso.'),
    uiText('Body drift matters more than one lucky turn.', 'La deriva corporal importa más que un buen turno.'),
    uiText('Time windows are part of the mountain, period.', 'Las ventanas de tiempo son parte de la montaña.'),
    uiText('Summit only counts if you make it back safely.', 'La cumbre solo cuenta si regresas con seguridad.'),
  ];

  const buildChips = (rows) => rows.map(([label, text]) => `<div class="help-chip"><strong>${label}</strong><small>${text}</small></div>`).join('');
  const buildBullets = (rows) => rows.map((text) => `<li>${text}</li>`).join('');

  return `
    <section>
      <h4>${t('ui.gameHelpPressureTitle')}</h4>
      <div class="game-help-grid">${buildChips(pressureRows)}</div>
    </section>
    <section>
      <h4>${t('ui.gameHelpTrendTitle')}</h4>
      <div class="game-help-grid">${buildChips(trendRows)}</div>
    </section>
    <section>
      <h4>${uiText('Confidence and signal quality', 'Confianza y calidad de señal')}</h4>
      <div class="game-help-grid">${buildChips(confidenceRows)}</div>
      <p class="help-note">${uiText('Even pretty weather can bite when your body drifts, the hour runs late, or confidence drops.', 'Incluso con clima lindo podés meterte en problema si tu cuerpo deriva, se hace tarde o cae la confianza.')}</p>
      <p class="help-note">${uiText('Retreat is a strategic win when it protects your margin to come back safe.', 'Retirarte también es victoria estratégica cuando preserva tu margen para volver seguro.')}</p>
    </section>
    <section>
      <h4>${uiText('How to read this game', 'Cómo leer este juego')}</h4>
      <ul class="help-bullets">${buildBullets(readGameBullets)}</ul>
    </section>
  `;
}
