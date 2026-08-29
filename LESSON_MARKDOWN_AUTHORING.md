# Lesson Markdown authoring contract

Lesson authors and AI agents provide content only. The application owns the lesson shell, progress, navigation, action buttons, feedback states, spacing, typography, animation, accessibility behavior, and responsive layout.

The content pipeline is:

```text
Markdown source → lesson-authoring parser → existing StepRenderer → locked template shell
```

## Existing-system audit

| Responsibility | Existing source of truth |
| --- | --- |
| Locked content/footer shell | `src/ui/template-shell.js` |
| Explanatory lesson blocks | `src/ui/lesson-content.js` |
| Question markup | `src/ui/ship-ready-level.js` |
| Question interactions | `src/ui/ui-lab/index.js` |
| Real lesson flow/progress | `src/ui/lesson-view.js` |
| Markdown parsing and sanitizing | `src/markdown/renderer.js` |
| Declarative lesson parsing | `src/markdown/lesson-authoring.js` |
| Live authoring workspace | `src/ui/markdown-lab.js` |
| Approved template data | `src/data/ship-ready.js` |

The approved authored interactions are single-choice MCQ, true/false through the same single-choice component, written response, ordering, code fill-blanks, spot-the-bug, and browser code-editor practice. Published Markdown lessons render all seven through the authored lesson runtime.

Single-choice check/retry state is duplicated between `src/ui/lesson-view.js` and `src/ui/ui-lab/index.js`. New authored previews use the UI Lab implementation; they do not add a third copy. Consolidating those two existing controllers can happen independently without changing this authoring syntax.

Multiple-select and matching are not yet approved reusable components in the project, so the authoring parser does not pretend to support them. Add a shared renderer and behavior first, then add one directive mapping to it.

The Design System gallery also contains fixed trace, Parsons-style reorder, diagnosis, and boundary-test demonstrations. They are hard-coded reference prototypes, not data-driven lesson components, so Markdown lessons cannot select them.

All authored interactions currently use practice-to-mastery behavior: the learner must complete the component before continuing. Markdown does not support scored checkpoint fields such as `phase:` or `critical:`. Progress UI and persistence are application-owned.

## Normal lesson content

Write regular Markdown for headings, paragraphs, lists, tasks, tables, emphasis, links, images, and fenced code. Existing callouts, reveals, technical terms, and standalone YouTube links continue to work.

```md
# HTTP Requests

The browser sends an **HTTP request** to a server.

:::tip Keep this in mind
The application controls how this callout looks.
:::

An [[term: origin | A URL's scheme, host, and port.]] controls same-origin checks.
```

Supported content syntax includes:

- `#` through `######` headings, paragraphs, blockquotes, horizontal rules, ordered and unordered lists, and GFM task lists and tables.
- `**bold**`, `*emphasis*`, `~~strikethrough~~`, inline code, and normal Markdown links.
- `![Useful alt text](assets/lessons/day-001/request-flow.png)` for local or HTTPS images. There is no Mermaid or generated-image directive; save a generated diagram as an asset and reference it with normal image syntax.
- Fenced code. Put the language first, then optional `title=` and `highlight=` metadata: ```` ```javascript title=request.js highlight=2,4-6 ````. Highlight values are one-based lines or inclusive ranges separated by commas.
- `[[term: term | Definition shown to the learner.]]` for an explicit technical term. `[[API]]`, `[[HTTP]]`, `[[origin]]`, and `[[runtime]]` are the only built-in shorthand definitions; prefer the explicit form for everything else.
- `:::tip`, `:::note`, `:::remember`, `:::warning`, `:::mistake`, `:::security`, and `:::accessibility` callouts. Put an optional title after the type, content on following lines, then close with `:::`.
- `:::reveal Optional title` for a learner-controlled disclosure. Use it for delayed reasoning or an answer, not essential content the learner may never open.
- A supported YouTube URL alone on a line for a privacy-enhanced responsive player. Supported URL forms are `youtube.com/watch`, `youtu.be`, `/shorts/`, `/live/`, and `/embed/`, including `t` or `start` timestamps. A YouTube URL inside a sentence remains a link.

Raw HTML is not lesson syntax. The authoring validator rejects it outside fenced code. Never use HTML, CSS, JSX, classes, inline styles, iframes, or wrappers to create lesson UI. HTML/CSS/JS inside a fenced example or `:::code-question` starter file is lesson subject matter and is allowed.

## Shared directive rules

- Open with `:::type` and close with `:::`.
- Put an interactive opening such as `:::mcq` on a line by itself. Only content callouts and `:::reveal` accept a title on the opening line.
- Use `title:`, `question:`, `explanation:`, and `hint:` for content strings.
- Use `id | Label` when a stable item ID is useful. The renderer creates an ID when it is omitted.
- Markdown inside answer labels and feedback is rendered through the existing sanitized inline renderer.
- Directives select an existing component. They never contain HTML, CSS, JSX, layout classes, or shell configuration.
- Use `<!-- lesson-step -->` between two consecutive explanation screens. Interactive directives already create their own step boundaries.
- Published lessons must add `<!-- step-id: stable-kebab-id -->` to every explanation and `id: stable-kebab-id` to every interaction so saved progress remains stable. IDs must be unique lowercase kebab-case.
- Unsupported directives and fields are validation errors. Do not add `phase:`, `critical:`, arbitrary attributes, or renderer options.
- Raw HTML and nested directives are rejected inside interactive blocks. Content callouts must also close cleanly and cannot contain another directive.

## Single choice

```md
:::mcq
title: HTTP responses
question: Which status code means Not Found?

- [ ] ok | `200 OK`
- [x] missing | `404 Not Found`
- [ ] error | `500 Internal Server Error`

explanation: `404` means the resource could not be found.
hint: Look for the missing-resource client error.
:::
```

Exactly one answer must use `[x]`.

Parser-required: at least two choices and exactly one `[x]`. For a published lesson, also provide `id`, `title`, `question`, `explanation`, and `hint`. Optional: `kicker`. Choice IDs are optional but recommended and must be unique when supplied. This component is single-choice only.

## True or false

True/false intentionally maps to the existing single-choice component.

```md
:::true-false
title: URL fragments
question: A URL fragment is sent in the HTTP request.
answer: false
explanation: The browser uses the fragment locally.
hint: Think about the part after `#`.
:::
```

Use only `answer: true` or `answer: false`; checkbox choices are rejected. For a published lesson, provide `id`, `title`, `question`, `answer`, `explanation`, and `hint`. Optional: `kicker`.

## Written response

```md
:::response
title: Request vs response
question: Explain the difference and give one example.
rubric:
- What the client sends
- What the server returns
- One real example
field-label: Your explanation
placeholder: A request is what the client sends...
max-length: 420
:::
```

The UI uses the existing Explain It component. Required: a non-empty `rubric` list. For a published lesson, also provide `id`, `title`, and `question`. Optional fields are `rubric-title`, `field-label`, `placeholder`, `guide`, and `max-length` (default `420`, integer `80`–`2000`). The server accepts titles up to 160 characters, questions up to 800 characters, and 1–8 rubric items of at most 240 characters each. The pass score is application-owned at 8/10.

This component depends on the `/api/explain-review` service and an available Codex CLI. If review is unavailable, it reports that honestly and cannot grade the answer. Do not use it when that service will not exist in the target environment.

## Ordering

The number in brackets is the correct position. Source order may be mixed so the preview bank does not reveal the answer.

```md
:::sequence
title: Put the request flow in order
question: What happens from click to pixels?

- [3] response | The server sends a response
- [1] click | Someone clicks a link
- [4] render | The browser renders the page
- [2] request | The browser sends a request

explanation: Click, request, response, render.
hint: Start with the user action.
:::
```

Parser-required: at least two items; unique consecutive ranks from `1`; unique item IDs. For a published lesson, also provide `id`, `title`, `question`, `explanation`, and `hint`. Optional: `kicker`, `mascot`, and `placeholder`.

## Fill in the blanks

Named `[[blank]]` markers connect code positions to the answers list.

````md
:::fill-blanks
title: Complete the fetch request
question: Fill both blanks.
code:
```javascript
fetch([[endpoint]], { method: [[method]] });
```
answers:
- endpoint | "/api/users"
- method | "GET"
options:
- `"POST"`
- `"/api/users"`
- `"GET"`
- `"/api/posts"`
explanation: Use GET with the users endpoint.
hint: The endpoint is the first argument.
:::
````

Parser-required: fenced code with at least one lowercase named blank, one answer for every blank name, and enough single-use options to include every expected answer (including duplicate values used by multiple blanks). For a published lesson, also provide `id`, `title`, `question`, `explanation`, and `hint`. Optional: `kicker`, `mascot`, and `code-label`.

## Spot the bug

````md
:::spot-bug
title: Which line breaks the code?
question: Select the syntax error and explain it.
code:
```javascript
const response = await fetch("/api/users");
const users = await response.json(;
console.log(users);
```
line: 2
reasons:
- [ ] method | The `json` method does not exist
- [x] parenthesis | A closing parenthesis is missing
- [ ] declaration | The variable must use `let`
explanation: `response.json()` needs its closing parenthesis.
hint: Read the punctuation on line 2.
:::
````

This component currently presents selectable JavaScript lines. Parser-required: a fenced code block, a valid one-based `line`, at least two reasons with unique IDs, and exactly one `[x]` reason. For a published lesson, also provide `id`, `title`, `question`, `explanation`, and `hint`. Optional: `kicker` and `mascot`.

## Code question

Markdown selects the existing code editor but does not define its layout. Authors provide instructions, starter files, requirement labels, and declarative checks. The application owns the editor, live preview, validation behavior, feedback, and navigation.

`````md
:::code-question
title: Build an explorer card
instructions:
Update the starter files and run the checks.
requirements:
- Keep the name inside an `<h1>`.
- Use `Mira the Explorer` with exact capitalization.
- Add a card background.
html:
```html
<article class="explorer-card">
  <h1>Mira</h1>
</article>
```
css:
```css
.explorer-card { padding: 24px; }
```
js:
```javascript
console.log("ready");
```
checks:
- html-selector | h1
- file-contains | html | Mira the Explorer | case-sensitive
- css-property | background, background-color
:::
`````

Each requirement has one check. Supported checks are:

- `html-selector | selector`
- `css-property | property, alternate-property`
- `file-contains | html|css|js | text | case-sensitive|case-insensitive`

Checks are static, application-owned validators; lesson Markdown cannot execute custom test code. Starter HTML, CSS, and JavaScript are exercise content rendered inside the editor’s sandboxed preview, not lesson layout code.

Required: `instructions`, at least one requirement, exactly one check per requirement in the same order, and at least one non-empty starter file. For a published lesson, also provide `id` and `title`. The three available files are `html`, `css`, and `js`; omitted files open empty.

Check limitations are deliberate:

- `html-selector` only verifies that `querySelector(selector)` finds an element.
- `css-property` only verifies that one listed property is declared somewhere; it does not verify selector or value.
- `file-contains` performs an exact or case-insensitive substring check. Its search text cannot contain the `|` separator.
- The preview is a sandboxed browser document. It is not a Node.js, Express, React build, package-manager, database, or test-runner environment. JavaScript may run in the preview, but authored checks cannot inspect runtime output.

Use this component only when its static checks genuinely prove the requirements. Do not represent a backend or framework exercise as a browser editor task merely to make it interactive.

## Publishing and validation

Follow the existing candidate module pattern in `src/data/lessons/candidates/day-001.js`: export the Markdown source, pass it to `defineMarkdownLesson(...)` with lesson metadata, and register the module in `src/data/lessons/lesson-registry.js`. Because the source currently lives in a JavaScript template literal, escape Markdown backticks and any literal `${` sequence.

`defineMarkdownLesson(...)` enforces the published-only IDs and complete fields described above when `status` is `published` or omitted. `status: "candidate"` keeps draft fallbacks available while a lesson is being developed; it does not waive the requirements for publication.

Before publishing:

1. Confirm every explanation and interaction has a stable unique ID.
2. Confirm the Markdown Lab or lesson source drawer reports zero authoring issues.
3. Run `npm run build`; this imports and validates every registered lesson.
4. Run `npm test`.
5. Exercise every used interaction in the rendered lesson. Run `npm run test:browser` when parser, renderer, shared component behavior, or the representative Day 1 lesson changes.

Known unsupported capabilities include multiple-select, matching, free-form diagram DSLs such as Mermaid, arbitrary embeds, custom HTML/CSS lesson UI, custom code tests, Node/React/backend execution, and author-controlled progress or checkpoint scoring. Use a supported representation that tests the intended understanding, or leave the activity non-interactive rather than inventing a component.

## Extension rule

To add another question type, first create or approve one reusable StepRenderer and one shared behavior controller. Then add a parser mapping from content fields to that component's data contract. Do not allow lesson source to provide tags, classes, styles, templates, or arbitrary attributes.
