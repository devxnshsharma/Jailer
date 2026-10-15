# Requirements: Mass Metro: Shadow of Muthu Nagar

**Defined:** 2026-10-15
**Core Value:** Players can enter a responsive, replayable action game where combat resources, combos, missions, and scores behave predictably while the neon Muthu Nagar world provides the complete playable experience.

## Baseline Evidence

The ingest set contained no source requirements, so these v1 requirements are derived from the current repository and the requested planning scope.

- `npm test`: **pass** — 1 file and 8 tests passed.
- `npm run typecheck`: **pass**.
- `npm run build`: **pass** — Vite emits the production `dist/` artifact.
- Built-in browser smoke: **inconclusive** because the local page load timed out; interactive completion remains pending independent observation.

## v1 Requirements

Requirements for the initial playable browser release. Each maps to exactly one roadmap phase.

### Reproducible Setup

- [ ] **SETUP-01**: A clean checkout can reproduce the project toolchain with Node `22.14.0` from `.nvmrc`, the exact dependencies in `package-lock.json`, and the existing npm scripts and Dockerfile without relying on globally installed tooling.

### Deterministic Gameplay Logic

- [x] **LOGIC-01**: The pure helpers in `src/game/logic.ts` deterministically clamp health and special meter, enforce special-meter spending and cooldown boundaries, advance or reset combos by their timing window, cap mission progress, report mission completion, and calculate integer scores for normal and edge inputs.

### Unit Verification

- [x] **TEST-01**: `npm test` executes the project-local deterministic logic suite in `tests/logic.test.ts` and passes all current cases.

### Browser Entry & Orchestration

- [ ] **BROWSER-01**: A browser entrypoint at `src/main.ts` mounts the existing `Game` orchestrator at the `#app` element so the Three.js city, entities, input, effects, missions, HUD, screens, audio, and local save flow form a buildable and playable Vite application; the source integration and production build are complete, while the interactive smoke run remains to be observed.

## v2 Requirements

No additional v2 requirements are identified from the empty source-planning set or the current repository baseline.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend, authentication, accounts, or remote APIs | No repository evidence or user request requires server-side services. |
| Network multiplayer or server-authoritative gameplay | Existing gameplay systems are local and frame-driven. |
| Cloud deployment features or a framework replacement | The requested scope preserves the existing Vite/Three.js/npm/Docker approach. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LOGIC-01 | Phase 1: Deterministic Core & Unit Baseline | Complete |
| TEST-01 | Phase 1: Deterministic Core & Unit Baseline | Complete |
| BROWSER-01 | Phase 2: Browser Entry & Playable Orchestration | Pending |
| SETUP-01 | Phase 3: Reproducible Release Path | Pending |

**Coverage:**
- v1 requirements: 4 total
- Mapped to phases: 4
- Unmapped: 0 ✓
- Complete from repository evidence: 2 (`LOGIC-01`, `TEST-01`)

---
*Requirements defined: 2026-10-15*
*Last updated: 2026-10-15 after repository baseline inspection and roadmap creation*
