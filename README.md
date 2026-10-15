# Mass Metro: Shadow of Muthu Nagar

Mass Metro: Shadow of Muthu Nagar is a browser-first Three.js action game set
in a neon city. The game runs entirely in the browser: combat, missions,
score, audio, and the local high-score save are client-side.

The hero, city, story, audio cues, and visual language are original. The game
uses a fictional Tamil-cinema-inspired protagonist, Vetri Varman, rather than
embedding a real actor's likeness, film footage, film soundtrack, logos, or
dialogue.

## Requirements

- Node.js `22.14.0` (the version is pinned in `.nvmrc`)
- npm bundled with Node.js
- A current browser with WebGL and hardware acceleration enabled
- Docker, only when using the container deployment path

No environment variables or external services are required. `.env.example` is
kept as a safe placeholder for future deployment configuration.

## Setup

From the project directory:

```bash
nvm install
nvm use
npm ci
```

The lockfile is authoritative. Dependencies are installed into the project;
do not install the toolchain globally.

## Run locally

Start the Vite development server:

```bash
npm run dev
```

Open <http://localhost:4173/>. The server host and port are defined in
`vite.config.ts`.

For a production-like local run:

```bash
npm run build
npm run preview
```

Then open the preview URL printed by Vite.

## Controls

| Action | Keyboard |
| --- | --- |
| Move | `WASD` or arrow keys |
| Light attack | `J` |
| Heavy attack | `K` |
| Dodge | `Q` |
| Jump | `Space` |
| Sprint | `Shift` |
| Pause/resume | `Escape` |
| Abilities | `1`–`4` |

Touch controls are available through the on-screen HUD on supported devices.

## Test and verification

Run the deterministic gameplay suite:

```bash
npm test -- --run tests/logic.test.ts
```

Run the complete project-local test command:

```bash
npm test
```

Run typechecking and the production build:

```bash
npm run typecheck
npm run build
```

The current logic suite covers health damage/healing, special-meter gain and
consumption, cooldown boundaries, combo progression, mission progress and
completion, and score calculation. The helpers live in
`src/game/logic.ts` and do not depend on Three.js or browser APIs.

## Docker deployment

Build the image from the project directory:

```bash
docker build -t mass-metro-shadow-of-muthu-nagar .
```

Run nginx on port `8080`:

```bash
docker run --rm -p 8080:80 mass-metro-shadow-of-muthu-nagar
```

Open <http://localhost:8080/>. The multi-stage `Dockerfile` builds the Vite
artifact with Node 22 and serves `dist/` through nginx using `nginx.conf`.

## Vercel deployment

The repository includes `vercel.json` with the reproducible commands:

- Install: `npm ci`
- Build: `npm run build`
- Output directory: `dist`

Connect the repository to Vercel or run the Vercel CLI from the project
directory after authenticating with Vercel. No project secrets are required.

## Project structure

```text
src/main.ts             Browser entrypoint and #app mount
src/game/Game.ts        Three.js game loop and orchestration
src/game/logic.ts       Pure deterministic gameplay rules
src/entities/           Hero, enemy, and boss entities
src/missions/           Mission progression
src/ui/                 HUD and menu/pause/victory screens
src/world/              Neon city scene construction
src/styles/             Global game styling
tests/logic.test.ts     Vitest coverage for deterministic rules
.planning/              GSD project context, requirements, roadmap, and state
```

## Planning documentation

The generated project context is in `.planning/`:

- `.planning/PROJECT.md` — project scope, constraints, and decisions
- `.planning/REQUIREMENTS.md` — requirement IDs and traceability
- `.planning/ROADMAP.md` — phased delivery plan and success criteria
- `.planning/STATE.md` — current planning position and blockers
- `.planning/INGEST-CONFLICTS.md` — source-document ingest report

The ingest scan found no pre-existing ADR, PRD, SPEC, RFC, or DOC files, so
these planning artifacts were derived from the current repository and verified
commands rather than synthesized from external planning documents.

## Troubleshooting

- **Blank page or WebGL error:** enable hardware acceleration and use a current
  browser. The entrypoint renders a recovery message when WebGL initialization
  is unavailable.
- **Port already in use:** stop the process using port `4173`, or pass a
  different Vite port for a one-off run.
- **Dependency drift:** remove `node_modules/` and rerun `npm ci`; never edit
  `package-lock.json` by hand.
