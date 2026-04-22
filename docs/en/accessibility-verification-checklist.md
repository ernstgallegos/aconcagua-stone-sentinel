# Accessibility Verification Checklist (web-v1 public flows)

Use this quick checklist for release-facing UI changes.

## Scope

Verify at minimum:
- title
- expedition setup
- onboarding modal
- game
- debrief
- summit-success
- part2 bridge (`part2-character` + narrative sequence)

## Keyboard and focus

- [ ] Every interactive control is reachable with keyboard-only navigation.
- [ ] Focus indicator is visible on primary controls and icon buttons.
- [ ] `Escape` closes shared overlays/modals consistently.
- [ ] Focus returns to the triggering control after closing a modal.

## Semantics and labels

- [ ] Dialogs use `role="dialog"` + `aria-modal="true"` and have a proper accessible name.
- [ ] Icon-only controls include explicit `aria-label`.
- [ ] Grouped controls expose understandable labels (`aria-label`/`aria-labelledby`).
- [ ] Status/timer text that changes during play uses appropriate `aria-live` behavior.

## Screen-reader clarity

- [ ] Deep-link/startup/fatal states expose meaningful text (no silent failures).
- [ ] Outcome/debrief summary remains understandable without visual styling.
- [ ] Part 2 lock state communicates intentional gating (not missing content).

## Suggested validation evidence

```bash
npm test
npm run test:contracts
```

For visible changes, include one screenshot artifact in the final report.
