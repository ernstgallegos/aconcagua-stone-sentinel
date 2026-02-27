# DEV NOTE — Stage/Time/Sleep Integration (MRA v0)

## Qué cambió
- Se añadió una capa explícita de **stage** (`APPROACH`, `HIGH_CAMP`, `SUMMIT_DAY`) mapeada por nodo clave.
- Se añadió reloj diegético: `Day N` + `minutesOfDay` (inicio 06:00).
- Nuevas reglas de tiempo por acción:
  - `ADVANCE` +120 min
  - `ADVANCE_SLOWLY` +180 min
  - `WAIT` +60 min
  - `DESCEND` +120 min
  - `SLEEP` -> próximo día 06:00
- Se agregó acción **SLEEP** (solo en campamentos).
- A las 22:00 (`nightStartMinutes`), si no estás en campamento, se aplica **forced bivouac** (penalidad severa y determinista) y arranca nuevo día.
- Se agregó “First Irreversible Point” al entrar al tramo de high camps (`camp_a` o más alto), con costo extra al descender desde ese momento.
- Se añadieron indicadores compactos de incertidumbre: confianza (%) + rangos y flechas de tendencia en métricas corporales.

## Parámetros centralizados
En `TUNING` (dentro de `index.html`):
- `timeCostMinutes`
- `resourceBurnPerHour` por stage
- `sleepRecoveryByCamp`
- `stage.*` (fatiga/exposición/clima/probabilidad de progreso/confianza)
- `bivouacPenalty`
- `retreatPenaltyAfterIrreversible`
- `confidence` coefficients

## Determinismo
- Narrativas ahora usan RNG de semilla (`G.rng`) en lugar de `Math.random` durante la simulación.
- Mismo seed + misma secuencia de decisiones produce mismos resultados sistémicos.

## Diferencia WAIT vs SLEEP
- `WAIT` = decisión táctica corta (1 hora), con recuperación baja/variable por stage.
- `SLEEP` = ciclo nocturno completo, solo en campamento, con recuperación dependiente del camp/stage.

## Checklist manual (rápido)
1. Iniciar partida y verificar `Day 1 · 06:00` en panel.
2. En Horcones confirmar que botón `Sleep` está oculto.
3. Llegar a Confluencia; verificar que `Sleep` aparece.
4. Usar `Sleep`; verificar `Day +1` y hora `06:00`.
5. Forzar noche fuera de campamento (acciones seguidas); verificar flag/penalidad `forced-bivouac`.
6. Llegar a `Camp 1 — Canadá`; verificar log de `first-irreversible-point`.
7. Ejecutar `Descend` luego del irreversible; verificar flag/costo extra de retiro.
8. Intentar cumbre y retorno a `Cólera` con `Descend` desde `summit`.
