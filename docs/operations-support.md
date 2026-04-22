# Operations Support — Public Prototype (`web-v1`)

This runbook captures the most common public/runtime issues and the command set expected in release-readiness reports.

## 1) Startup/data-load failures

If the title screen remains blocked or `#screen-fatal-error` appears:

1. Open browser devtools and inspect the blocking diagnostics panel.
2. Confirm required data files are reachable under `data/`:
   - `nodes.json`
   - `environmental_pressure_config.json`
   - `action_modifiers.json`
   - `stage_modifiers.json`
   - `characters.json`
   - `character_events.json`
   - `context_events.json`
   - `outcomes.json`
   - `scenarios.web-v1.json`
3. Validate JSON integrity:
   ```bash
   npm run validate:json
   ```
4. If startup fails only in deploy, compare CORS/routing settings using `docs/deploy-routing.md`.

## 2) Deep-link misuse / bad parameters

Hash deep links are strict by design for launch safety.

- `character` and `scenario` must be valid canonical IDs.
- `seed` must be an integer and (for predefined scenarios) belong to the scenario seed list.
- `outcome` (for `#debrief`) must exist in `data/outcomes.json`.

Invalid links now fail safely to `expedition-setup` (or `title` for unknown screens) instead of bootstrapping inconsistent state.

Reference: `docs/deep-links.web-v1.md`.

## 3) Overlay/modal input issues

Expected behavior:

- `Escape` closes intro/tutorial/onboarding modals and in-game overlays.
- Backdrop click closes shared overlays where enabled.
- Focus returns to the triggering control after close.

If this is broken:

1. Verify no duplicate IDs were introduced in modal containers.
2. Run unit tests:
   ```bash
   npm test -- --test-name-pattern="flow-controller|accessibility|modal"
   ```

## 4) In-progress run navigation safety

When leaving `#game` for non-run screens during an active expedition, the UI must request confirmation before navigation.

If reports indicate lost runs without warning:

- Check `prototype/web-v1/ui/flow-controller.js` leave-run guard wiring.
- Verify state transitions in `prototype/web-v1/ui/screens.js` (`shouldConfirmLeaveRun` / `confirmLeaveRun`).

## 5) Release-readiness command set (report exactly)

```bash
npm run typecheck
npm test
npm run test:contracts
pytest prototype/mra-v0/test_simulator.py -v
npm run validate:json
npm run validate:links
npm run smoke:release
```

If any gate is skipped, document the precise environment limitation in the PR/final report.
