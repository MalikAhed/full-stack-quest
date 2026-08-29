# Ready to Ship templates + Markdown renderer

This package is a runnable handoff of the approved lesson templates and the shared Markdown rendering system from Full-Stack Quest.

## Run it

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:4173/?page=more`, choose **SHIP READY**, and open any template. You can also use the direct routes below.

### Enable AI review for Explain It

The Explain It template sends answers to the local development server, which runs Codex non-interactively and returns a structured score plus short feedback. Install and authenticate the Codex CLI once before starting the app:

```bash
npm install -g @openai/codex
codex login
npm run dev
```

The server uses the saved CLI authentication, starts no interactive terminal, and never exposes credentials to the browser. Repeated identical answers are cached and simultaneous identical requests share one CLI run. If the CLI is missing, unauthenticated, or takes longer than eight seconds, the mascot explicitly says **AI review unavailable** and does not display a score. The app never presents hard-coded feedback as an AI review.

Optional server settings:

| Variable | Purpose |
| --- | --- |
| `EXPLAIN_REVIEW_CLI` | Path or command name for the Codex executable; defaults to `codex`. |
| `EXPLAIN_REVIEW_MODEL` | Optional model override; otherwise the CLI's configured model is used. |
| `EXPLAIN_REVIEW_TIMEOUT_MS` | Maximum review time before an explicit unavailable result; defaults to `8000`. |

## Template routes

| Template | Route |
| --- | --- |
| Markdown workspace | `?view=ship-ready-markdown` |
| Content area | `?view=ship-ready` |
| Multiple choice | `?view=ship-ready-mcq` |
| Explain it | `?view=ship-ready-response` |
| Put in order | `?view=ship-ready-sequence` |
| Fill in the blanks | `?view=ship-ready-fill-blanks` |
| Spot the bug | `?view=ship-ready-spot-bug` |
| Code editor | `?view=ship-ready-code-lab` |

## Where another AI should work

- `src/data/ship-ready.js` is the single template registry. Add or change lesson text and answers here.
- `src/ui/template-shell.js` owns the shared top progress and bottom action areas.
- `src/ui/ui-lab/index.js` renders the data-driven question templates.
- `src/server/explanation-review.mjs` runs and validates Explain It reviews through `codex exec`, with caching and explicit failure reporting.
- `src/server/explanation-review.schema.json` is the strict structured-output contract for AI scores and feedback.
- `src/ui/markdown-lab.js` owns the Ready to Ship Markdown workspace and its sample document.
- `LESSON_MARKDOWN_AUTHORING.md` defines the content-only lesson format and records the existing shell/question ownership audit.
- `src/markdown/lesson-authoring.js` parses interactive directives into existing question component data.
- `src/markdown/renderer.js` is the shared Markdown parser, sanitizer, code highlighter, lesson directives, technical terms, and YouTube transformation.
- `src/styles/markdown-lab.css` owns shared rendered-Markdown styling, including the card-free responsive YouTube player.
- `src/ui/lesson-content.js` connects the same Markdown system to real lessons.
- `src/ui/design-system-view.js` renders the approved Code Editor template.

Do not recreate the top progress, bottom actions, question shells, or Markdown features inside individual lessons. Reuse the registry and shared renderers, changing only template data whenever possible.

## Markdown video syntax

Put a YouTube URL by itself on a line:

```markdown
https://www.youtube.com/watch?v=AlkDbnbv7dk
```

The shared renderer turns it into a responsive YouTube player with no surrounding card, heading, description, border, or shadow. Inline YouTube links inside sentences remain links. Supported forms include `youtube.com/watch`, `youtu.be`, Shorts, Live, Embed, and timestamps.

Raw iframe HTML remains blocked by the sanitizer. The trusted player iframe is mounted only after a standalone URL passes YouTube host and video-ID validation.

## Verification

```bash
npm run verify
```

The browser coverage for Ready to Ship is in `scripts/browser-ship-ready.mjs`. Markdown rendering, sanitization, inline-link behavior, and the card-free video player are covered in `scripts/browser-markdown-lab.mjs`.

## Package contents

The ZIP includes the runnable source, styles, app shell, template and lesson assets, test suite, browser verification scripts, package manifests, and development server. Installed dependencies and generated review artifacts are intentionally excluded; restore dependencies with `npm install`.
