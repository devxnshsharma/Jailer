# Mass Metro — Native Demo Web Runtime

Mass Metro now runs as a dependency-free browser game. The web runtime uses
one raw HTML page, WebGL 1, and browser APIs only. It does not use Three.js,
Vite, React, or a game framework.

The gameplay vocabulary is based on the native demo reference: the complete
weapon inventory, melee/firearm/projectile/explosive modes, mission flow,
vehicles, rain, wanted pressure, Tamil street landmarks, and boss finale are
implemented with original low-poly WebGL primitives so the project can run without
proprietary game binaries or missing native submodules.

## What is included

- Native-demo inventory taxonomy:
  - Colt .45
  - Shotgun
  - M16
  - Unarmed
  - Baseball Bat
  - Uzi
  - AK-47
  - Sniper Rifle
  - Rocket Launcher
  - Flamethrower
  - Molotov
  - Grenade
  - Detonator
  - Heli Cannon
- Tamil street scenarios:
  - Neon Bazaar / Kovil Street
  - Rooftop Reckoning / bus-route rooftops
  - Iron Hideout / harbour freight yard
  - The Last Bell / temple finale
- Original Canvas landmarks: temple gopuram, kolam, Tamil signs, tea stalls,
  coconut palms, harbour crane, buses, autos, sedans, and a metro train.
- Combat modes: melee, hitscan, spread, flame cone, grenades, rockets,
  detonator area effects, heli cannon projectiles, enemy ranged fire, healing
  pickups, aura abilities, reloads, dodge, sprint, and mission rewards.

## Requirements

- Node.js `22.14.0` (pinned in `.nvmrc`)
- npm bundled with Node.js
- Any current browser with WebGL support

No package dependencies or external services are required.

## Setup

```bash
nvm install
nvm use
npm ci
```

The lockfile is intentionally dependency-free. Do not install a global
toolchain.

## Run locally

Start the raw static server:

```bash
npm run dev
```

Open <http://localhost:4173/>.

Build and serve the exact production directory:

```bash
npm run build
npm run preview
```

The build copies `index.html` and `web/` into `dist/`; there is no bundling or
transpilation step.

## Controls

| Action | Input |
| --- | --- |
| Move | `WASD` or arrow keys |
| Fire | Left mouse button or `L` |
| Aim | Mouse position |
| Dodge | `Q` |
| Reload | `R` |
| Equip inventory slot | `Z` through `]` |
| Cycle inventory | `Tab` / `Shift+Tab` / mouse wheel |
| Mass Entry | `Space` or `1` |
| Aura Strike | `2` |
| Time Veil | `3` |
| Final Bell | `4` |
| Pause | `Escape` |

The armory buttons are also clickable.

## Test and verification

Run the offline Node test command:

```bash
npm test
```

The tests verify the raw HTML entrypoint, absence of Three.js/Vite imports,
raw WebGL integration, complete demo inventory names, and Tamil scenario
content.

## Docker deployment

```bash
docker build -t mass-metro-native-web .
docker run --rm -p 8080:80 mass-metro-native-web
```

Open <http://localhost:8080/>. The Dockerfile installs the pinned Node runtime,
runs the dependency-free static build, and serves `dist/` through nginx.

## Project structure

```text
index.html             Static browser entrypoint
web/game.js            Raw WebGL game loop, world, combat, and UI updates
web/renderer3d.js      Dependency-free low-poly 3D renderer and camera
web/styles.css         HUD and briefing screen styling
tools/serve.mjs        Dependency-free local static server
tools/build.mjs        Static production copy step
tests/raw-game.test.mjs Offline runtime contract tests
demo-folder/           Native C++ reference material, not bundled at runtime
```

## Native reference boundary

`demo-folder/` contains a native re3/RenderWare source tree. Its complete
native executable requires external `librw` submodules and licensed GTA III
runtime data such as `GTA3.DAT`, map archives, collision files, models, and
audio. Those inputs are not present in this repository and are not copied into
the web artifact. The browser runtime therefore uses a clean-room Canvas
implementation of the demo's gameplay direction instead of pretending that
the incomplete native tree is already a browser binary.
