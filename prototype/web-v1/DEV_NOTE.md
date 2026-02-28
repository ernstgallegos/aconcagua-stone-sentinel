# DEV NOTE — Stage / Time / Sleep Integration (web-v1)

> **Language note:** English summary follows. The original Spanish working notes are preserved below unchanged, under the `---` separator, for historical accuracy.

## Summary (English)

This note records the mechanic extensions added to `prototype/web-v1/index.html` that diverge intentionally from the Python MRA v0 simulator. These are design evolutions for interactive validation — not ports of the Python logic.

### Changes introduced in web-v1

- **Stage system:** Three explicit stages (`APPROACH`, `HIGH_CAMP`, `SUMMIT_DAY`) mapped by node, each with separate resource burn rates, fatigue multipliers, and progress probabilities.
- **Diegetic clock:** Runs start at Day 1 · 06:00. Action time costs: `advance` +120 min, `advance_slowly` +180 min, `wait` +60 min, `descend` +120 min, `sleep` → next day 06:00.
- **New action — `advance_slowly`:** Slower ascent with different resource and fatigue trade-offs.
- **New action — `sleep`:** Available only at camp nodes. Triggers full overnight recovery scaled by camp type and current stage.
- **Forced bivouac:** If the player has not reached a camp node by 22:00, a severe deterministic penalty is applied and the day resets.
- **First Irreversible Point:** Triggered on entering `camp_a` or higher. Any descent from this point incurs an extra `retreatPenaltyAfterIrreversible` cost.
- **Uncertainty indicators:** Each body metric displays a confidence percentage and a trend arrow derived from `cognitive_noise`.
- **Seeded RNG:** Narrative variance uses `G.rng` (seeded) rather than `Math.random()`. Same seed + same decision sequence produces the same systemic outcome.

### Key tuning parameters (centralized in `TUNING` object in `index.html`)

| Parameter | Description |
|---|---|
| `timeCostMinutes` | Per-action time cost in minutes |
| `resourceBurnPerHour` | Resource consumption rate per stage |
| `sleepRecoveryByCamp` | Functional capacity recovery on sleep, by camp type |
| `dayStartMinutes` | Day start time (default: 360 = 06:00) |
| `nightStartMinutes` | Night threshold for forced bivouac (default: 1320 = 22:00) |
| `bivouacPenalty` | Penalty applied on forced night outside camp |
| `retreatPenaltyAfterIrreversible` | Extra cost for descending past the first irreversible point |
| `confidence` | Coefficients for uncertainty display |

### Relationship to Python MRA v0 (`simulator.py`)

These mechanics are **not replicated** in `simulator.py`. The Python simulator remains the canonical reproducible artifact for hypothesis testing (deterministic, seeded, documented). The web-v1 implementation is an exploratory interactive extension and may diverge further as design evolves.

---

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
