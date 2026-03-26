export function buildHelpSections(uiText, t) {
  const pressureRows = [
    [uiText('Low', 'Baja'), uiText('Broad tactical margin. Keep rhythm but monitor hydration and time.', 'Margen táctico amplio. Mantén el ritmo, pero vigila hidratación y tiempo.')],
    [uiText('Manageable', 'Manejable'), uiText('Progress is viable if body trend remains stable and confidence is not collapsing.', 'El progreso es viable si la tendencia corporal se mantiene estable y la confianza no cae.')],
    [uiText('Severe', 'Severa'), uiText('Narrow margin. Prefer slower pushes and pre-plan retreat windows.', 'Margen estrecho. Prioriza avances lentos y planifica ventanas de retirada.')],
    [uiText('Very Severe', 'Muy severa'), uiText('High attrition risk. Advance only with strong body state and clean signal.', 'Riesgo alto de desgaste. Avanza solo con estado corporal fuerte y señal clara.')],
    [uiText('Extreme', 'Extrema'), uiText('System is near refusal. Preservation and descent logic should dominate.', 'El sistema está cerca de la negativa. Deben dominar la preservación y la lógica de descenso.')],
  ];

  const trendRows = [
    [uiText('Easing', 'Mejorando'), uiText('Pressure is relaxing. Confirm with confidence before committing long pushes.', 'La presión afloja. Confírmalo con confianza antes de comprometer empujes largos.')],
    [uiText('Steady', 'Estable'), uiText('Conditions are persistent. Keep economy discipline and avoid overconfidence.', 'Las condiciones persisten. Mantén disciplina económica y evita el exceso de confianza.')],
    [uiText('Worsening', 'Empeorando'), uiText('Risk is rising. Reduce aggressiveness and protect descent options.', 'El riesgo está subiendo. Reduce agresividad y protege opciones de descenso.')],
    [uiText('Worsening fast', 'Empeorando rápido'), uiText('Rapid instability. Prioritize survival margin over altitude gain.', 'Inestabilidad rápida. Prioriza el margen de supervivencia por encima de ganar altura.')],
    [uiText('Uncertain', 'Incierta'), uiText('Signal quality is degraded. Prefer robust actions with lower exposure cost.', 'La calidad de señal está degradada. Prefiere acciones robustas con menor costo de exposición.')],
  ];

  const confidenceRows = [
    [uiText('High confidence', 'Alta confianza'), uiText('Your reading is coherent, not infallible. Keep validating trend against body drift.', 'Tu lectura es coherente, no infalible. Sigue validando la tendencia con la deriva corporal.')],
    [uiText('Medium confidence', 'Confianza media'), uiText('Signals are usable with caution. Avoid chaining high-cost actions.', 'Las señales son útiles con cautela. Evita encadenar acciones de alto costo.')],
    [uiText('Low confidence', 'Baja confianza'), uiText('Interpretation range is wide. Favor robust options and retreat-ready pacing.', 'El rango de interpretación es amplio. Prioriza opciones robustas y ritmo listo para retirada.')],
  ];

  const readGameBullets = [
    uiText('Read trend before impulse.', 'Lee la tendencia antes del impulso.'),
    uiText('Body drift matters more than one good turn.', 'La deriva corporal importa más que un buen turno.'),
    uiText('Time windows are part of the mountain.', 'Las ventanas de tiempo son parte de la montaña.'),
    uiText('The summit only counts if you return safely.', 'La cumbre solo cuenta si regresas con seguridad.'),
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
      <p class="help-note">${uiText('Good weather can still be dangerous when your body is drifting, time is late, or confidence is degraded.', 'El buen clima puede seguir siendo peligroso cuando tu cuerpo deriva, el horario es tarde o la confianza está degradada.')}</p>
      <p class="help-note">${uiText('Retreat is a strategic success when it preserves safe return margin.', 'La retirada es un éxito estratégico cuando preserva margen de regreso seguro.')}</p>
    </section>
    <section>
      <h4>${uiText('How to read this game', 'Cómo leer este juego')}</h4>
      <ul class="help-bullets">${buildBullets(readGameBullets)}</ul>
    </section>
  `;
}
