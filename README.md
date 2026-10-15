# Mass Metro: Shadow of Muthu Nagar

Mass Metro: Shadow of Muthu Nagar is a browser-first Three.js action game built with TypeScript and Vite.

## Prerequisites

- Node.js `22.14.0` (the repository version is pinned in `.nvmrc`)
- npm bundled with Node.js
- Docker, only when using the container serving path

## Setup

From the repository root:

```bash
nvm install 22.14.0
nvm use 22.14.0
npm ci
```

The lockfile is authoritative. Dependencies are installed locally in the project; no global npm packages are required.

## Run locally

Start the Vite development server:

```bash
npm run dev
```

Open the URL printed by Vite (the configured default port is `4173`). After a production build, preview the generated artifact with:

```bash
npm run preview
```

## Test and build

Run the deterministic unit suite:

```bash
npm test
```

Run the typecheck and production build:

```bash
npm run typecheck
npm run build
```

The build writes the static browser artifact to `dist/`.

## Deploy with the existing container path

Build the Docker image and serve it through nginx:

```bash
docker build -t mass-metro-shadow-of-muthu-nagar .
docker run --rm -p 8080:80 mass-metro-shadow-of-muthu-nagar
```

Open `http://localhost:8080`. The container uses the repository's `Dockerfile` and `nginx.conf`; no backend service is required.
