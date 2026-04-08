# Deep-link quick summary — `prototype/web-v1`

Compact contributor reference derived from [`docs/deep-links.web-v1.md`](./deep-links.web-v1.md).

## Canonical base URL

`https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html`

## Format

`#<screenId>[&param=value...]`

- First segment is always the screen ID used by `showScreen()`.
- Optional params follow as `&key=value`.
- URL-encode spaces/special chars in values (e.g., `Collapse%20(Fatigue)`).

## Screen ID table

| Screen ID | Description | Valid parameters | Gate |
|---|---|---|---|
| `title` | Welcome / cover | — | None |
| `fatal-error` | Blocking data load failure | — | Auto (internal) |
| `expedition-setup` | Character + scenario carousels | — | None |
| `game` | Playable turn loop | `character`, `scenario`, `seed` | None |
| `debrief` | Post-run debrief | `character`, `scenario`, `seed`, `outcome` | None |
| `summit-success` | Summit achieved bridge | — | Outcome: Summit and Safe Return |
| `part2-character` | Part 2 character/route selection | `force=1` | `Summit and Safe Return` (or `force=1`) |
| `mendoza_room` | Part 2 narrative: Mendoza room | `force=1` | Part 2 gate |
| `team_presentation` | Part 2 narrative: team presentation | `force=1` | Part 2 gate |
| `after_circle` | Part 2 narrative: after circle | `force=1` | Part 2 gate |
| `guides` | Part 2 narrative: guides | `force=1` | Part 2 gate |
| `briefing_night` | Part 2 narrative: briefing night | `force=1` | Part 2 gate |
| `departure_road` | Part 2 narrative: road to Horcones | `force=1` | Part 2 gate |
| `future_cta` | Part 2 narrative: follow/share CTA | `force=1` | Part 2 gate |
| `journal` | Expedition journal / field log | — | None |

> **Maintenance:** if a `<section id="screen-…">` is added or renamed in `prototype/web-v1/index.html`, update this table and the full reference in [`docs/deep-links.web-v1.md`](./deep-links.web-v1.md).

## Most-used deep links

- `#title`
- `#expedition-setup`
- `#onboarding&character=francisco&scenario=assisted-route&seed=1234` _(modal flow entry — opens over `#game`, not a standalone DOM screen)_
- `#game&character=francisco&scenario=assisted-route&seed=1234`
- `#debrief&outcome=Strategic%20Retreat`
- `#summit-success`

## Part 2 gate testing

Part 2 screens normally require a prior `Summit and Safe Return`. For evaluation, use `&force=1` (example: `#part2-character&force=1`).

`&force=1` sets `localStorage` key `aconcagua_summit_achieved_v1`; clear site data to reset.

## Common parameters

- `character` for `game`, `onboarding` (modal), `debrief`
- `scenario` for `game`, `onboarding` (modal), `debrief`
- `seed` for reproducible runs
- `outcome` for mocked debrief states
- `force=1` for Part 2 gate bypass during testing

## Valid character IDs

`francisco` · `laura` · `irina` · `erik` · `daniela` · `blake`

## Valid outcome values (URL-encoded where needed)

`Summit%20and%20Safe%20Return` · `High%20Point%20Return` · `Strategic%20Retreat` · `Rescue` · `Collapse%20(Fatigue)` · `Collapse%20(Exposure)` · `Resource%20Exhaustion` · `Expedition%20Window%20Closed` · `Permit%20Expired` · `Fatality`

## Canonical full reference

Use the complete EN/ES table and all screen URLs in [`docs/deep-links.web-v1.md`](./deep-links.web-v1.md).
