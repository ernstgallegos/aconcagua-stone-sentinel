# Deep-link quick summary — `prototype/web-v1`

Compact contributor reference derived from [`docs/deep-links.web-v1.md`](./deep-links.web-v1.md).

## Canonical base URL

`https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html`

## Format

`#<screenId>[&param=value...]`

- First segment is always the screen ID used by `showScreen()`.
- Optional params follow as `&key=value`.
- URL-encode spaces/special chars in values (e.g., `Collapse%20(Fatigue)`).

## Most-used deep links

- `#title`
- `#expedition-setup`
- `#onboarding&character=francisco&scenario=assisted-route&seed=1234`
- `#game&character=francisco&scenario=assisted-route&seed=1234`
- `#debrief&outcome=Strategic%20Retreat`
- `#summit-success`

## Part 2 gate testing

Part 2 screens normally require a prior `Summit and Safe Return`. For evaluation, use `&force=1` (example: `#part2-character&force=1`).

`&force=1` sets `localStorage` key `aconcagua_summit_achieved_v1`; clear site data to reset.

## Common parameters

- `character` for `game`, `onboarding`, `debrief`
- `scenario` for `game`, `onboarding`, `debrief`
- `seed` for reproducible runs
- `outcome` for mocked debrief states
- `force=1` for Part 2 gate bypass during testing

## Canonical full reference

Use the complete EN/ES table and all screen URLs in [`docs/deep-links.web-v1.md`](./deep-links.web-v1.md).
