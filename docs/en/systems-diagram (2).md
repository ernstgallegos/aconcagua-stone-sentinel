# Systemic Architecture Diagram (Mermaid)

This file contains Mermaid diagrams that render cleanly on GitHub.

## 1) Full Systems and Interactions (Overview)

```mermaid
flowchart LR
  %% =========================
  %% Aconcagua: Stone Sentinel
  %% Systemic Architecture
  %% =========================

  %% --- Subsystem clusters ---
  subgraph ENV[Environment]
    direction TB
    W[Weather System];
    M[Mountain and Terrain System];
  end

  subgraph HUMAN[Human State]
    direction TB
    B[Physiological System - Body];
    R[Resource System];
    E[Equipment System];
  end

  subgraph INFO[Information]
    direction TB
    I[Information System - Interface];
  end

  subgraph AGENCY[Agency]
    direction TB
    D[Decision and Consequence System];
  end

  %% --- Key coupling variables ---
  X[Exposure Time];
  S[Accumulated State];

  %% --- Core interactions ---
  W -->|modifies conditions| M;
  M -->|loads and constrains| B;

  %% --- Mediation / mitigation ---
  E -->|mitigates exposure and changes cost| B;
  R -->|stabilizes or deteriorates| B;

  %% --- Decision integration ---
  B -->|constrains actions| D;
  D -->|route and pace choices| M;
  D -->|timing and waiting| W;
  D -->|consumption and rest| R;
  D -->|gear use and loadout| E;
  D -->|sets| X;

  %% --- Exposure as amplifier ---
  W -->|shapes exposure impact| X;
  M -->|shapes exposure impact| X;
  X -->|amplifies effects on body| B;

  %% --- Information flows (signals, not certainty) ---
  W -->|signals| I;
  M -->|cues| I;
  B -->|symptoms| I;
  R -->|status| I;
  E -->|condition| I;

  I -->|partial awareness| D;

  %% --- Persistence over time ---
  D -->|persistent consequence| S;
  S -->|conditions future performance| B;
  S -->|conditions future resources| R;
  S -->|conditions future equipment| E;
  S -->|conditions future decisions| D;
```

## 2) Key Feedback Loops (Representative)

```mermaid
flowchart LR
  %% =========================
  %% Feedback Loops (Key)
  %% =========================

  %% R1 - Cold Exposure Spiral - Reinforcing
  subgraph R1_ColdExposureSpiral
    direction LR
    C1[Wind and Cold];
    C2[Perceived Warmth];
    C3[Body Temperature];
    C4[Dexterity and Judgment];
    C5[Errors and Delays];
    C6[Exposure Time];

    C1 -->|reduces| C2;
    C2 -->|reduces| C3;
    C3 -->|reduces| C4;
    C4 -->|increases| C5;
    C5 -->|increases| C6;
    C6 -->|increases| C3;
  end

  %% B1 - Equipment Mitigation - Balancing
  subgraph B1_EquipmentMitigation
    direction LR
    B1a[Insulation and Protection];
    B1b[Heat Loss];
    B1c[Body Temperature];
    B1d[Functional Capacity];
    B1e[Decision Quality];
    B1f[Exposure Time];

    B1a -->|reduces| B1b;
    B1b -->|stabilizes| B1c;
    B1c -->|preserves| B1d;
    B1d -->|improves| B1e;
    B1e -->|reduces| B1f;
    B1f -->|reduces| B1b;
  end

  %% R2 - Fatigue and Terrain - Reinforcing
  subgraph R2_FatigueTerrain
    direction LR
    T1[Steep or Unstable Terrain];
    T2[Energy Expenditure];
    T3[Fatigue];
    T4[Pace];
    T5[Time to Progress];

    T1 -->|increases| T2;
    T2 -->|increases| T3;
    T3 -->|reduces| T4;
    T4 -->|increases| T5;
    T5 -->|increases| T2;
  end

  %% B2 - Progressive Acclimatization - Balancing
  subgraph B2_ProgressiveAcclimatization
    direction LR
    A1[Gradual Ascent plus Rest];
    A2[Acclimatization];
    A3[Altitude Penalties];
    A4[Performance Capacity];

    A1 -->|increases| A2;
    A2 -->|reduces| A3;
    A3 -->|stabilizes| A4;
    A4 -->|supports| A1;
  end

  %% R3 - Mental Load and Risk Perception - Reinforcing
  subgraph R3_MentalLoadRisk
    direction LR
    M1[Adverse Conditions plus Fatigue];
    M2[Cognitive Load];
    M3[Risk Perception];
    M4[Poor Decisions];
    M5[Dangerous Situations];

    M1 -->|increases| M2;
    M2 -->|distorts| M3;
    M3 -->|drives| M4;
    M4 -->|increases| M5;
    M5 -->|increases| M2;
  end
```

### Notes for GitHub
- Keep the code blocks exactly as shown: triple backticks + `mermaid`.
- Avoid parentheses in labels if you hit renderer-specific parse errors.
- Use simple subgraph identifiers (no bracketed titles) for maximum compatibility.
