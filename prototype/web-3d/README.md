# Aconcagua: Stone Sentinel — 3D prototype (private work in progress)

Third-person 3D vertical slice of the Normal Route. Same story, climbers, scenarios, rules and outcomes as `prototype/web-v1`; only the presentation changes.

> **Status: unlisted.** This build is not linked from the landing page or the READMEs and is served with `noindex`. Reach it only through the direct link below. The source lives in a public repository, so "private" here means *unadvertised*, not access-controlled.

## Open it

- Deployed: `https://aconcaguastonesentinel.com/3D-prototype` (redirects to `/prototype/web-3d/index.html`)
- Local: from the repository root run `python3 -m http.server 4173`, then open `http://localhost:4173/prototype/web-3d/`

The title screen asks for an access word (shared privately; only its salted hash is in the source). It can also be passed once as `?key=<word>`; the unlock is remembered in the browser.

No build step. `three.js` r187 is vendored in `vendor/` (MIT, see `vendor/THREE-LICENSE.txt`).

## How it plays

The mountain governs, and actions are walked instead of picked from a menu.

| You do | Engine action |
|---|---|
| Walk up-trail through a threshold (stone piles + prayer flags near the top of each stretch) at steady pace | `advance` |
| Same, having walked most of the stretch at careful pace | `advance_slowly` |
| Walk back down through a threshold | `descend` |
| Rest (`R`) | `wait` |
| Sleep in your tent at a camp (`E`) | `sleep` |
| Take a photo as Daniela (`P`) | `shoot_photo` |
| Leave through the park gate at Horcones (`E` twice) | `descend` at Horcones (ends the run) |

At each threshold the canonical engine resolves one turn and answers: the way opens, the mountain holds you, or it drives you back one node. Time, weather, visibility, fatigue and the permit clock only move on turns; the sky, fog, wind, snow, the climber's posture and walking speed reflect that state.

Controls: `WASD`/arrows move, drag to look, wheel to zoom, `C` pace, `R` rest, `E` interact, `F` follow the trail, `L` field log, `Esc` pause, `M` mute. Touch devices get a stick and four buttons.

There is no XP, levelling or loot. That decision is deliberately deferred.

## Rendering

Aimed at "careful indie 3D in a browser", keeping the palette of the cover and concept art.

- **Ground**: one layered PBR material (`src/materials.js`) blends bedrock, scree, worn trail and snow per pixel from slope, altitude and noise, with triplanar detail and bump. Its textures are generated procedurally at load, so no texture files are shipped. Boulders use the same material and pick up snow caps.
- **The massif**: the backdrop mountain is real elevation data of Aconcagua (`assets/aconcagua-dem.bin`, see `assets/DEM-ATTRIBUTION.md`), enlarged and with exaggerated relief. It is scenery; the walkable route is still a compressed, procedural ribbon designed for pacing.
- **Sky**: time-of-day gradient with a procedural cloud deck whose cover follows weather severity, sea of clouds below the high camps, wind-blown snow, fog driven by visibility.
- **Post-processing** (`src/post.js`): ambient occlusion, restrained bloom, a colour grade (violet shadows, warm highlights) and tone mapping.
- **Quality levels**: `high` (default on desktop: AO, 4K shadows), `medium` (default on touch devices: no AO), `low` (direct render). Force one with `?quality=low|medium|high`; without it the game steps down automatically if frames are slow.
- **Climber, tents, water**: articulated procedural climber (two-segment limbs, down jacket, pack, pole), dome tents with poles and guy lines, Fresnel water on the lagoon.

Rebuild the vendored files only when upgrading three.js:

```bash
npm pack three@0.187.0 && tar xzf three-0.187.0.tgz
npx esbuild package/build/three.module.js --bundle --minify --format=esm --outfile=vendor/three.module.min.js
# add-ons: an entry file re-exporting EffectComposer, RenderPass, ShaderPass, UnrealBloomPass, GTAOPass, SMAAPass, OutputPass
npx esbuild addons-entry.js --bundle --minify --format=esm --external:three --outfile=vendor/three-addons.min.js
node prototype/web-3d/tools/bake-dem.mjs   # re-bake the elevation model (needs network)
```

## Architecture

- `src/sim.js` — headless adapter over the canonical engine (`../web-v1/engine/*`, `../web-v1/state/game-state.js`). Nothing in the rules is reimplemented; it mirrors the dependency helpers of `web-v1/ui/screens.js` the same way `scripts/monte-carlo-web-v1.js` does.
- `src/route.js` — where nodes and thresholds sit along the walkable axis; the walk ⇄ turn mapping.
- `src/terrain.js` — pure height field and route ⇄ world mapping.
- `src/world.js`, `src/materials.js`, `src/sky.js`, `src/post.js`, `src/character.js`, `src/audio.js` — scene, surface materials, sky and weather, post-processing, procedural climber, procedural wind.
- `src/main.js` — flow (title → setup → briefing → walk → debrief), input, camera, HUD.
- `src/gate.js` — access word gate. `src/part2-data.js` — Part 2 plates, generated from web-v1 by `tools/sync-part2.mjs` (parity-tested; never edit by hand).
- Data comes from `/data/*.json`; nothing else is duplicated.

Known shared debt: a `sleep` turn burns one hour of water and food instead of a night (inherited from web-v1; see `docs/technical-debt-register.md`, "Detail: sleep time cost").

Known differences from web-v1: no real-time decision window (pace and direction are the decision), Part 2 is shown as narrative plates only (no character/route selection step), no journal persistence or run-log export, and narrative lines use their own RNG stream so the engine stream depends only on seed and actions.

## Tests

```bash
npm run test:web3d
```

Covers route/threshold geometry, terrain mapping, engine adapter determinism and outcome wiring, EN/ES parity, Part 2 parity with web-v1, the access gate, and the privacy guards (noindex, unlisted redirect, no links from public entry points).

Useful URL parameters for testing: `?key=<word>&autostart=1&char=francisco&scenario=assisted-route&seed=10&lang=es&debug=1&quality=low`.
