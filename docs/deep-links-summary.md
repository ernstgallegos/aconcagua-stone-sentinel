# Deep-link quick summary — `prototype/web-v1`

Compact contributor reference for hash-based deep-link navigation.
Full canonical detail: [`docs/deep-links.web-v1.md`](./deep-links.web-v1.md).

## Canonical base URL

`https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html`

## Format

`#<screenId>[&param=value...]`

- First segment is always the screen ID used by `showScreen()`.
- Optional params follow as `&key=value`. Bare flags (no `=`) parse as `true`.
- URL-encode spaces/special chars in values (e.g., `Summit%20and%20Safe%20Return`).
- Empty or missing hash → no-op, page loads on title screen normally.

## Supported screen IDs

| Screen ID | Deep-link behaviour |
|---|---|
| `title` | No-op (default start) |
| `expedition-setup` | Navigate directly |
| `onboarding` | Needs `character` + `scenario`; falls back to `expedition-setup` |
| `game` | Needs `character` + `scenario`; missing → stay on title |
| `debrief` | Delegates to `bootstrapMockDebrief(params)` |
| `summit-success` | Navigate directly |
| `part2-character`, Part 2 narrative IDs | Part 2 gate applies; `force=1` bypasses |
| Any other ID | Navigate directly (hash not written back) |

## Common parameters

| Param | Screens | Notes |
|---|---|---|
| `character` | `game`, `onboarding`, `debrief` | Must match an ID in `data/characters.json` |
| `scenario` | `game`, `onboarding`, `debrief` | Must match an ID in `data/scenarios.web-v1.json` |
| `seed` | `game`, `onboarding` | Reproducible seeded run |
| `outcome` | `debrief` | e.g. `Strategic%20Retreat` |
| `force` | Part 2 screens | `force=1` bypasses Part 2 gate |

## Fallback/invalid behavior

- `#game` or `#onboarding` with unknown `character` → stays on title / redirects to `expedition-setup`.
- `#game` or `#onboarding` with unknown `scenario` → same fallback.
- Part 2 screen without summit access and no `force=1` → silently redirects to `debrief`.

## Most-used deep links

```
#title
#expedition-setup
#onboarding&character=francisco&scenario=assisted-route&seed=1234
#game&character=francisco&scenario=assisted-route&seed=1234
#debrief&outcome=Strategic%20Retreat
#summit-success
```

## Part 2 gate testing

Part 2 screens normally require a prior `Summit and Safe Return` outcome (or
stored summit flag in localStorage). For testing/evaluation, use `&force=1`:

```
#part2-character&force=1
#mendoza_room&force=1
```

`force=1` writes `localStorage` key `aconcagua_summit_achieved_v1` and sets
`finalOutcome = 'Summit and Safe Return'` in run state. Clear site data to reset.

## Implementation references

| File | Role |
|---|---|
| `ui/helpers/routing.js` | `parseDeepLinkHash()` / `syncScreenHash()` |
| `ui/flow-controller.js` | `handleDeepLink()` — route dispatcher |
| `ui/helpers/screen-utils.js` | `resolveNavigationTarget()` — Part 2 gate |
| `tests/unit/flow-controller.test.js` | Deep-link integration tests |
| `tests/unit/routing.test.js` | Hash parse / sync unit tests |
