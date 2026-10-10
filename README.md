# Full-Stack Quest

[Open the published course](https://malikahed.github.io/full-stack-quest/)
A browser-based full-stack learning project with a themed course map, interactive lessons, and locally saved progress. The map defines 16 weeks; the current lesson registry includes days 1–7.

## Run locally

Use Node.js 20 or newer and npm. From the repository root:

```bash
npm ci
npm run dev
```

Open [http://localhost:4173](http://localhost:4173). The development server watches source files and reloads the page when they change.

To use another port on a POSIX shell:

```bash
PORT=4174 npm run dev
```

Use the development server rather than opening `index.html` directly: the app loads JavaScript modules and installed browser dependencies over HTTP.

## Validate changes

```bash
npm run check
```

This runs syntax checks, Node.js tests, static application validation, and the manageability audit. `npm run build` validates the static app; it does not create a bundled `dist/` directory.

For the checks above plus the browser smoke suite:

```bash
npm run verify
```

Browser tests need Chrome or Chromium. The runner checks common Linux executable paths; set `CHROME_BIN` to the browser executable on other setups. It starts and stops its own development server and uses a mock reviewer by default.

## Project map

- `index.html` and `src/main.js`: application entry points
- `src/data/course.js`: course map and week configuration
- `src/data/lessons/candidates/`: authored lesson modules
- `src/data/lessons/lesson-registry.js`: lessons available to the loader
- `src/markdown/`: lesson Markdown parsing and rendering
- `src/ui/` and `src/styles/`: interface components and styles
- `tests/` and `scripts/`: automated checks and browser validation

Before authoring or changing a lesson, read [AGENTS.md](AGENTS.md) and [LESSON_MARKDOWN_AUTHORING.md](LESSON_MARKDOWN_AUTHORING.md). Published step IDs are persisted in learner progress and must remain stable.

## Local review service and static hosting

The development server exposes `POST /api/explain-review` for reviewed responses. That feature requires an available, authenticated Codex CLI in the server environment. The browser smoke suite's mock reviewer does not verify a live Codex connection.

[The GitHub Pages workflow](.github/workflows/pages.yml) assembles the static files and required browser dependencies, then deploys on every push to `main` or a manual workflow run. GitHub Pages does not run `dev-server.mjs` or its review endpoint. A documentation-only push to `main` also triggers this deployment.

## License

See [LICENSE](LICENSE) for the MIT license.
