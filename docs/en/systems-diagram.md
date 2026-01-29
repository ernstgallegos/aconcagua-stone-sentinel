# Systemic Architecture Diagram (Mermaid)

Paste this file into your GitHub repository (Markdown supported). GitHub will render the Mermaid diagrams automatically in most contexts.

## 1) Full Systems & Interactions (Overview)

```mermaid
flowchart LR
  %% =========================
  %% Aconcagua: Stone Sentinel
  %% Systemic Architecture
  %% =========================

  %% --- Subsystem clusters ---
  subgraph ENV[Environment]
    direction TB
    W[Weather System]
    M[Mountain / Terrain System]
  end

  subgraph HUMAN[Human State]
    direction TB
    B[Physiological System (Body)]
    R[Resource System]
    E[Equipment System]
  end

  subgraph INFO[Information]
    direction TB
    I[Information System (Interface)]
  end

  subgraph AGENCY[Agency]
    direction TB
    D[Decision & Consequence System]
  end

  %% --- Core causal links ---
  W -->|modifies conditions| M
  M -->|loads / constrains| B

  %% --- Mediation links ---
  E -->|mitigates exposure
& modifies cost| B
  R -->|stabilizes / deteriorates| B

  %% --- Decision integration ---
  B -->|constrains available actions| D
  D -->|route & pace choices| M
  D -->|timing / waiting| W
  D -->|consumption & rest| R
  D -->|gear use & loadout| E
  D -->|sets exposure time| X[Exposure Time]

  %% --- Exposure as a key coupling variable ---
  X -->|amplifies climate effects| B
  W -->|wind/cold/precip
shape exposure impact| X
  M -->|terrain/exposure
shape exposure impact| X

  %% --- Information flows (signals, not certainty) ---
  W -->|signals| I
  M -->|cues| I
  B -->|symptoms| I
  R -->|status| I
  E -->|condition| I

  I -->|partial awareness| D

  %% --- Persistent consequence (state changes) ---
  D -->|persistent consequence| S[Accumulated State]
  S -->|conditions future performance| B
  S -->|conditions future resources| R
  S -->|conditions future equipment| E
  S -->|conditions future decisions| D
```

## 2) Key Feedback Loops (Representative)

```mermaid
flowchart LR
  %% =========================
  %% Feedback Loops (Key)
  %% =========================

  %% R1: Cold Exposure Spiral (Reinforcing)
  subgraph R1[R1 — Cold Exposure Spiral (Reinforcing)]
    direction LR
    C1[Wind / Cold] -->|reduces| C2[Perceived Warmth]
    C2 -->|reduces| C3[Body Temperature]
    C3 -->|reduces| C4[Dexterity & Judgment]
    C4 -->|increases| C5[Errors / Delays]
    C5 -->|increases| C6[Exposure Time]
    C6 -->|increases| C3
  end

  %% B1: Equipment Mitigation (Balancing)
  subgraph B1[B1 — Equipment Mitigation (Balancing)]
    direction LR
    B1a[Insulation / Protection] -->|reduces| B1b[Heat Loss]
    B1b -->|stabilizes| B1c[Body Temperature]
    B1c -->|preserves| B1d[Functional Capacity]
    B1d -->|enables| B1e[Clearer Decisions]
    B1e -->|reduces| B1f[Exposure Time]
    B1f -->|reduces| B1b
  end

  %% R2: Fatigue–Terrain (Reinforcing)
  subgraph R2[R2 — Fatigue and Terrain (Reinforcing)]
    direction LR
    T1[Steep / Unstable Terrain] -->|increases| T2[Energy Expenditure]
    T2 -->|increases| T3[Fatigue]
    T3 -->|reduces| T4[Pace]
    T4 -->|increases| T5[Time to Progress]
    T5 -->|increases| T2
  end

  %% B2: Progressive Acclimatization (Balancing, Long-Term)
  subgraph B2[B2 — Progressive Acclimatization (Balancing)]
    direction LR
    A1[Gradual Ascent + Rest] -->|increases| A2[Acclimatization]
    A2 -->|reduces| A3[Altitude Penalties]
    A3 -->|stabilizes| A4[Performance Capacity]
    A4 -->|supports| A1
  end

  %% R3: Mental Load & Risk Perception (Reinforcing)
  subgraph R3[R3 — Mental Load & Risk Perception (Reinforcing)]
    direction LR
    M1[Adverse Conditions + Fatigue] -->|increase| M2[Cognitive Load]
    M2 -->|distorts| M3[Risk Perception]
    M3 -->|drives| M4[Poor Decisions]
    M4 -->|increase| M5[Dangerous Situations]
    M5 -->|increase| M2
  end
```

### Notes for GitHub
- Keep the code blocks exactly as shown: triple backticks + `mermaid`.
- If Mermaid doesn’t render in your GitHub view, check repository settings / platform support, or render locally via Mermaid CLI.
