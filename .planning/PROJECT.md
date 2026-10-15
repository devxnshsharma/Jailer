# Mass Metro: Shadow of Muthu Nagar

## What This Is

Mass Metro: Shadow of Muthu Nagar is a browser-first Three.js action game set in a neon city. The current repository contains the gameplay entities, city construction, mission definitions, effects, audio, HUD, screens, and a deterministic gameplay-logic module intended to be driven by a Vite entrypoint.

The deterministic logic and its unit tests are present and verified. The browser application is not yet complete: `index.html` points at a missing `src/main.ts`, the current `Game.ts` file is syntactically incomplete, and the production build cannot succeed until those integration blockers and the existing Three.js type-check issue are resolved.

## Core Value

Players can enter a responsive, replayable action game where combat resources, combos, missions, and scores behave predictably while the neon Muthu Nagar world provides the complete playable experience.

## Requirements

### Validated

<!-- Only work verified by the current repository evidence is listed as validated. -->

- ✓ Deterministic gameplay helpers for health, meter, cooldowns, combos, mission progress, and score are implemented in `src/game/logic.ts` and covered by the current test suite.
- ✓ `npm test` passes the existing `tests/logic.test.ts` suite: 1 test file and 8 tests passed.

### Active

<!-- Current scope derived from the repository and this planning request. -->

- [ ] Reproduce the pinned Node/Vite toolchain from a clean checkout using the existing lockfile, scripts, and container path.
- [ ] Add the browser entrypoint and complete the existing Three.js game orchestration so the app loads and plays through Vite.

### Out of Scope

<!-- Explicit boundaries prevent unrelated features from entering the roadmap. -->

- Backend services, authentication, accounts, databases, and remote APIs — the repository is a client-side browser game and provides no evidence that these are needed.
- Network multiplayer or server-side gameplay — the current systems are local and frame-driven.
- Cloud-specific deployment features or a replacement framework — the roadmap preserves the existing Vite, TypeScript, Three.js, Vitest, npm-script, and Dockerfile approach.

## Context

- Ingest found zero source planning documents, decisions, requirements, constraints, and context topics. This baseline is therefore inferred directly from the current repository files.
- The declared runtime is Node `22.14.0` via `.nvmrc`. `package.json` declares Vite `6.0.7`, TypeScript `5.7.2`, Vitest `2.1.8`, and Three.js `0.171.0`; `package-lock.json` is lockfile version 3.
- Existing scripts are `dev`, `build`, `preview`, `test`, `test:watch`, and `typecheck`. The Dockerfile builds with Node 22 and serves `dist/` through nginx using `nginx.conf`.
- Existing modules cover `Hero`, `Enemy`, and `Boss` entities; `City`; `InputManager`, definitions, audio, effects, types, and deterministic logic; `MissionManager`; `Hud`; `Screens`; and a partially written `Game` orchestrator.
- Verification performed during baseline inspection:
  - `npm test` passes all 8 logic tests.
  - `npm exec -- vite build` fails because `/src/main.ts` cannot be resolved from `index.html`.
  - `npm run typecheck` reports the unfinished `src/game/Game.ts` (`'}' expected`) and missing declarations for the declared `three` package.
  - `npm run build` consequently fails during its `tsc --noEmit` step; the direct Vite check independently confirms the missing browser entrypoint.

## Constraints

- **Runtime**: Target Node `22.14.0` and a browser runtime served by Vite; keep `.nvmrc` as the local runtime pin.
- **Dependencies**: Use the existing `package.json` and `package-lock.json`; do not rely on globally installed packages.
- **Rendering**: Preserve Three.js as the declared rendering dependency and use the existing `#app` mount in `index.html`.
- **Verification**: Keep deterministic logic independently testable with the existing Vitest command before relying on browser rendering.
- **Reproducibility**: The existing npm scripts, Dockerfile, and nginx configuration are the supported setup/run path; no backend service is assumed.
- **Planning basis**: Because the source planning set is empty, any newly discovered product behavior must be grounded in the existing modules or explicitly added as a future requirement.

## Key Decisions

<!-- Decisions that constrain future work. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Preserve the existing Node/Vite/TypeScript/Three.js/Vitest stack and lockfile | It is already declared in the repository and is the requested target runtime | — Pending |
| Treat `src/game/logic.ts` and its passing unit tests as the verified baseline | The pure logic is isolated and `npm test` passes all current cases | ✓ Good |
| Treat browser integration as pending until the entrypoint and orchestrator build cleanly | `src/main.ts` is missing, `Game.ts` is incomplete, and the build currently fails | — Pending |
| Keep the roadmap client-side and avoid backend/auth/deployment features | No source planning documents or repository modules justify those features | ✓ Good |

---
*Last updated: 2026-10-15 after empty-ingest baseline inspection and initial roadmap creation*
