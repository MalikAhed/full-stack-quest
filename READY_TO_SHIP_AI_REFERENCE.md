# Ready to Ship — AI reference pack

This is a small source-only reference for another AI. It contains the approved template UI/UX, shared component code, template data, layout styles, and Markdown system. It intentionally omits the full course, large artwork, screenshots, installed dependencies, and build artifacts.

## Instruction for the AI using this pack

Use the existing shared templates exactly. To create a lesson, add or replace text, answers, steps, code, and Markdown in the template data. Do not recreate the top progress area, content shell, bottom actions, question cards, editor, feedback UI, scroll indicator, or Markdown features inside an individual lesson.

For individual template data, start in `src/data/ship-ready.js`. For complete authored lessons, use `LESSON_MARKDOWN_AUTHORING.md` and write Markdown/directives only.

## Included templates

| Template | Registry type/renderer | Shared renderer |
| --- | --- | --- |
| Markdown workspace | `renderer: "markdown"` | `src/ui/markdown-lab.js` |
| Content area | `type: "content"` | `src/ui/ui-lab/index.js` |
| Multiple choice | `type: "mcq"` | `src/ui/ui-lab/index.js` |
| Explain it | `type: "response"` | `src/ui/ui-lab/index.js` |
| Put in order | `type: "sequence"` | `src/ui/ui-lab/index.js` |
| Fill in the blanks | `type: "fill-blanks"` | `src/ui/ui-lab/index.js` |
| Spot the bug | `type: "spot-bug"` | `src/ui/ui-lab/index.js` |
| Code editor | `renderer: "code"` | `src/ui/design-system-view.js` |

## Shared files that must remain shared

- `src/ui/template-shell.js`: approved top progress, content shell, bottom actions, and scroll affordance.
- `src/ui/ship-ready-level.js`: shared lesson-level composition.
- `src/ui/ui-lab/index.js`: all question interactions and feedback behavior.
- `src/server/explanation-review.mjs`: server-only Codex CLI review, request deduplication, timeouts, and explicit unavailable states for Explain It.
- `src/server/explanation-review.schema.json`: structured score and feedback contract used by `codex exec`.
- `src/markdown/renderer.js`: the only Markdown parser and sanitizer.
- `src/markdown/lesson-authoring.js`: maps declarative question directives to approved template data; it does not render layout.
- `src/styles/lesson.css`: main template and question layout styling.
- `src/styles/markdown-lab.css`: rendered Markdown and Markdown workspace styling.
- `src/styles/design-system/`: approved Code Editor layout and completion UI.

## Markdown content

Use normal Markdown strings for headings, paragraphs, lists, tasks, tables, links, images, blockquotes, and fenced code. The shared renderer also supports lesson directives and technical terms.

```markdown
:::tip Helpful title
Keep this explanation short.
:::

An [[term: HTTP | The protocol browsers and servers use to exchange requests and responses.]] request travels to a server.
```

For a card-free YouTube player, put the URL alone on a line:

```markdown
https://www.youtube.com/watch?v=AlkDbnbv7dk
```

Do not write iframe HTML. The renderer validates the standalone YouTube URL and mounts the player safely. A YouTube link used inside a sentence remains a normal link.

Interactive lesson steps use the documented `:::mcq`, `:::true-false`, `:::response`, `:::sequence`, `:::fill-blanks`, `:::spot-bug`, and `:::code-question` directives. All authored interactions currently use practice-to-mastery behavior; `phase:` and `critical:` are not supported Markdown fields. Do not put HTML, CSS, JSX, class names, or layout instructions in lesson content. Raw HTML outside fenced examples and code-question starter files is a validation error.

The fixed trace, Parsons-style reorder, diagnosis, and boundary-test examples in the Design System gallery are not reusable lesson renderers. Multiple-select, matching, Mermaid, arbitrary embeds, backend execution, and custom code tests are also unavailable to Markdown authors.

## What is not included

This reference pack is not a standalone copy of the whole application. Large PNG artwork, course-map data, lesson media, `node_modules`, screenshots, temporary files, and generated artifacts are excluded because they do not define the templates. Dependency names and versions needed by the Markdown renderer remain in `package.json`.
