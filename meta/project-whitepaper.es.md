# Aconcagua: Stone Sentinel — Whitepaper público (v0.2 / ES)

> Esta es la versión en español del whitepaper público.
> Mantiene la misma intención editorial y de alcance que `meta/project-whitepaper.md`.

## 1) Premisa

*Aconcagua: Stone Sentinel* es un proyecto narrativo-sistémico donde la montaña actúa como autoridad central.
No propone “ganar por dominar un sistema”, sino **aprender a leer límites, señales y contexto**.

La cumbre es una posibilidad; el retorno seguro es una decisión de igual valor narrativo y mecánico.

## 2) Tesis de diseño

- **Mountain-first:** el entorno manda sobre el jugador.
- **Información parcial:** no hay panel omnisciente; hay señales con confianza variable.
- **Consecuencia real:** las decisiones dejan huella y no se “limpian” con feedback cosmético.
- **Ética de resultado plural:** cumbre, retiro estratégico, rescate o colapso son outcomes canónicos con peso propio.

## 3) Qué hace diferente al proyecto

1. Traduce presión ambiental + tolerancia corporal en un loop jugable auditable.
2. Evita fantasías de control total: el diseño trabaja con incertidumbre y lectura situacional.
3. Trata el fracaso como parte legítima del aprendizaje y del relato.

## 4) Arquitectura pública (resumen)

- Prototipo activo: `prototype/web-v1`.
- Artefacto histórico/congelado: `prototype/mra-v0`.
- Contratos canónicos de outcomes y datos: `data/*.json`.
- Autoridad de turno: `resolveTurn(state, action)`.

## 5) Audiencia

- Jugadores que valoran simulación narrativa, ritmo contemplativo y tensión sistémica.
- Prensa, curadores/as y festivales que evalúan coherencia entre discurso y runtime.
- Colaboradores/as artísticos y técnicos interesados en proyectos con identidad autoral fuerte.

## 6) Estado público actual

- El flujo jugable actual es: `welcome/title → setup → onboarding → game → outcomes`.
- Parte 2 continúa como puente narrativo gateado (no campaña completa pública).
- La validación pública se apoya en tests de contrato/paridad, smoke de flujo y documentación sincronizada.

## 6b) Base de evidencia (v0.2)

Esta sección traduce las afirmaciones del whitepaper en evidencia de implementación verificable al momento de v0.2.

**Prototipo:**
- 6 personajes jugables con perfiles de motor diferenciados (percepción, eficiencia de recursos, aclimatización, postura de riesgo, capacidad funcional).
- 5 escenarios predefinidos con condiciones iniciales y semillas canónicas.
- 10 nodos de ruta en 3 etapas (Aproximación, Campo Alto, Día de Cumbre).
- Outcomes plurales: Cumbre y Retorno Seguro, Retorno al Punto Alto, Retirada Estratégica, Rescate, Colapso (Fatiga), Colapso (Exposición), Agotamiento de Recursos, Ventana de Expedición Cerrada, Permiso Vencido, Fatalidad.
- Sistema de permisos (hasta 20 días), ventana de decisión con degradación suave, visualización Canvas2D con identidad visual por personaje.

**Resultados de simulación (Monte Carlo v1.5.1, 1.500 corridas):**
- Ningún personaje produce 0% de cumbre → no hay regresión estructural en el motor.
- Tasas humanas observadas de cumbre: 10–30% para jugadores que internalizan el modelo EP/BT.
- Reporte completo: `docs/playtest-results/monte-carlo-v1.5.1.md`.

**Arquitectura:**
- 381 tests automatizados cubriendo motor, helpers de UI, API, paridad de contratos y pipelines de simulación.
- Repositorio público: [github.com/ernstgallegos/aconcagua-stone-sentinel](https://github.com/ernstgallegos/aconcagua-stone-sentinel).

## 7) Compromisos de publicación

- Claims públicos respaldados por evidencia en repositorio.
- Changelog y documentación de estado siempre actualizados.
- Enlaces públicos priorizan versiones bilingües consistentes.

## 8) Dirección

El objetivo no es escalar features rápido, sino sostener una experiencia coherente donde:

- el entorno tenga autoridad,
- las señales sean interpretables pero nunca absolutas,
- y la toma de decisiones conserve espesor humano.

---

Si necesitás la versión completa histórica de la visión fundacional en español, ver:
`docs/es/documento-conceptual.md`.
