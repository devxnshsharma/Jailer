# Roadmap: Mass Metro: Shadow of Muthu Nagar

## Overview

The roadmap starts from the verified deterministic gameplay core and its passing unit tests, then completes the missing browser entry and existing game orchestrator, and finally validates that the finished Vite application can be reproduced from a clean Node 22.14.0 checkout and served through the repository's existing container path. It intentionally stays within the current client-side Three.js game scope.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): planned milestone work
- Decimal phases are reserved for urgent insertions after planning

- [x] **Phase 1: Deterministic Core & Unit Baseline** - Preserve and verify the pure gameplay rules and their current Vitest coverage.
- [ ] **Phase 2: Browser Entry & Playable Orchestration** - Connect the existing Three.js systems through `src/main.ts` and make the browser game build and play end to end.
- [ ] **Phase 3: Reproducible Release Path** - Validate the pinned Node/npm workflow, project-local dependencies, existing scripts, and Docker/nginx serving path from a clean checkout.

## Phase Details

### Phase 1: Deterministic Core & Unit Baseline
**Goal**: The gameplay rules that do not depend on rendering are trusted as a stable foundation for browser integration.
**Depends on**: Nothing (first phase)
**Requirements**: LOGIC-01, TEST-01
**Success Criteria** (what must be TRUE):
  1. Health and special-meter operations keep values within their declared bounds, including negative inputs, over-max inputs, and zero/negative maxima.
  2. Cooldown readiness, combo continuation/reset, mission progress/completion, and score calculation return deterministic results at timing and edge boundaries.
  3. `npm test` passes the existing `tests/logic.test.ts` suite with all 8 tests green from the project-local toolchain.
**Plans**: 1 plan (existing verified baseline)

Plans:
- [x] 01-01: Verify deterministic gameplay helpers with the current unit suite.

### Phase 2: Browser Entry & Playable Orchestration
**Goal**: Players can launch the existing Three.js game from the HTML mount and use its current gameplay, UI, audio, and effects systems as one playable browser flow.
**Depends on**: Phase 1
**Requirements**: BROWSER-01
**Success Criteria** (what must be TRUE):
  1. Vite resolves `src/main.ts`, the entrypoint mounts `Game` into `#app`, and the page renders the Three.js canvas plus the existing HUD/screen layers without unresolved imports or type-check errors.
  2. A player can reach the title menu, start or restart a run, advance the briefing, move and attack with the existing keyboard/touch controls, and pause/resume through the current screen callbacks.
  3. The existing city, hero, enemies, boss, effects, mission progression, score/reward HUD, audio toggle, game-over, victory, and local-save behavior participate in one playable run through the mission flow.
  4. `npm run typecheck` and `npm run build` complete successfully and produce a Vite `dist/` artifact that contains the browser entrypoint.
**Plans**: 1 plan

Plans:
- [ ] 02-01: Complete the browser entry and repair the existing game orchestration/type surface so the Vite application builds and runs.
**UI hint**: yes

### Phase 3: Reproducible Release Path
**Goal**: A clean Linux checkout can reproduce installation, verification, browser build, and static serving using the repository's pinned runtime and project-local tooling.
**Depends on**: Phase 2
**Requirements**: SETUP-01
**Success Criteria** (what must be TRUE):
  1. Node `22.14.0` is selected from `.nvmrc` and `npm ci` installs exactly the lockfile-resolved dependencies without requiring globally installed packages.
  2. The existing `npm run test`, `npm run typecheck`, `npm run build`, `npm run dev`, and `npm run preview` commands are documented and execute against the completed browser app from the project directory.
  3. The existing Dockerfile builds the Vite artifact and nginx serves it using `nginx.conf`, with no backend service or machine-specific path required.
**Plans**: 1 plan

Plans:
- [ ] 03-01: Validate the pinned Node/npm workflow, lockfile install, npm scripts, and Docker/nginx serving path from a clean checkout.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Deterministic Core & Unit Baseline | 1/1 | Complete | 2026-10-15 |
| 2. Browser Entry & Playable Orchestration | 0/1 | Not started | - |
| 3. Reproducible Release Path | 0/1 | Not started | - |
