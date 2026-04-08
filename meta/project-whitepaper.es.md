# Aconcagua: Stone Sentinel — Whitepaper público (ES)

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
