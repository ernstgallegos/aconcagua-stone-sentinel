# Simulation Engine — Prototype Web v1.1

Prototype Web v1.1 introduces the **Environmental Pressure Engine**.

## System hierarchy

`Environment → Environmental Pressure → Body Response → Player Perception → Player Decision → Outcome`

## Environmental Pressure (EP)

EP is computed each turn by `calculateEnvironmentalPressure(state)` from six components:

- Altitude Pressure
- Terrain Load
- Weather Severity
- Visibility Risk
- Time of Day Risk
- Exposure Persistence

Formula:

`EP = (Altitude*0.30) + (Terrain*0.15) + (Weather*0.20) + (Visibility*0.10) + (Time*0.10) + (Persistence*0.15)`

## Body Tolerance (BT)

BT is computed by `calculateBodyTolerance(state)`:

`BT = (functionalCapacity*0.40) + (acclimatization*0.35) + (hydration*0.10) + (nutrition*0.05) - (fatiguePenalty*0.05) - (exposurePenalty*0.05)`

## Pressure Delta

`PressureDelta = EP - BT`

- `<= -15`: Favorable conditions
- `-14 to +10`: Demanding conditions
- `+11 to +30`: Overexertion zone
- `>= +31`: Mountain refusal zone

## Node System

Nodes are data-driven from `/data/nodes.json` and include:

- `nodeName`
- `altitudeBand`
- `terrainLoad`
- `weatherBias`
- `visibilityBias`
- `timeSensitivity`
- `isCamp`

## Stage System

Loaded from `/data/stage_modifiers.json`:

- `APPROACH`
- `HIGH_CAMP`
- `SUMMIT_DAY`

Each stage defines fatigue/exposure multipliers, weather bias, and confidence penalty.

## Action System

Loaded from `/data/action_modifiers.json`:

- Advance
- Advance Slowly
- Wait
- Descend
- Sleep (camp only)

## Logging

Each turn is appended to runtime log records with:

- `turn`
- `location`
- `EP`
- `BT`
- `pressureDelta`
- `action`
- `outcome`

At the end of a run, players can export `run_log.json` from debrief.
