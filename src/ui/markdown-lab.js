import { applyWeekTheme } from "../app/week-theme.js";
import { COURSE_WEEKS } from "../data/course.js";
import { escapeHtml } from "../lib/dom.js";
import { parseLessonMarkdown } from "../markdown/lesson-authoring.js";
import { mountMarkdownFeatures, renderMarkdownDocument } from "../markdown/renderer.js";
import { renderTemplateFooter, renderTemplateShell } from "./template-shell.js";
import { loadDesignSystem } from "./design-system-loader.js";
import { renderUiLab } from "./ui-lab/index.js";

const STORAGE_KEY = "full-stack-quest:markdown-lab-draft-v3";
const WEEK_OPTIONS = COURSE_WEEKS.map((week, index) => {
  const number = index + 1;
  const label = week.cardLabel.replace(/^Start Week \d+:\s*/, "");
  return `<option value="${number}">WEEK ${number} · ${label.toUpperCase()}</option>`;
}).join("");

export const SAMPLE_LESSON_MARKDOWN = [
  "# HTTP Requests",
  "",
  "When a browser requests a page, it sends an **HTTP request** to a server. An [[term: HTTP | The protocol browsers and servers use to exchange requests and responses.]] request includes a method and a path.",
  "",
  ":::tip Keep the shell locked",
  "Lesson authors provide content. The application owns progress, navigation, spacing, and feedback UI.",
  ":::",
  "",
  "| Request part | Example |",
  "| --- | --- |",
  "| Method | `GET` |",
  "| Path | `/api/users/42` |",
  "",
  "```javascript title=load-user.js highlight=2",
  "const response = await fetch(\"/api/users/42\");",
  "const user = await response.json();",
  "```",
  "",
  "https://www.youtube.com/watch?v=AlkDbnbv7dk",
  "",
  ":::mcq",
  "title: HTTP responses",
  "question: Which status code means Not Found?",
  "",
  "- [ ] ok | `200 OK`",
  "- [ ] unauthorized | `401 Unauthorized`",
  "- [x] not-found | `404 Not Found`",
  "- [ ] server-error | `500 Internal Server Error`",
  "",
  "explanation: `404 Not Found` means the requested resource could not be found.",
  "hint: Look for the client-error status used when a resource is missing.",
  ":::",
  "",
  ":::response",
  "title: Explain it in your own words",
  "question: Explain the difference between an HTTP request and an HTTP response, then give one example.",
  "rubric:",
  "- What the client sends",
  "- What the server returns",
  "- One real example",
  "field-label: Your explanation",
  "placeholder: A request is what the client sends to a server...",
  "max-length: 420",
  "guide: Start with what the client sends. Then explain what the server returns and include one real example.",
  ":::",
  "",
  "## From click to pixels",
  "",
  "The renderer can place explanatory Markdown and interactive steps in one authored document.",
  "",
  ":::sequence",
  "title: Put the request flow in order",
  "question: What happens after someone clicks a link?",
  "mascot: Follow the request one handoff at a time.",
  "",
  "- [3] response | The server sends a response",
  "- [1] click | Someone clicks a link",
  "- [4] render | The browser renders the page",
  "- [2] request | The browser sends a request",
  "",
  "explanation: A click becomes a request, then a response, then a rendered page.",
  "hint: Start with the user action and finish with the browser.",
  ":::",
  "",
  ":::fill-blanks",
  "title: Complete the fetch request",
  "question: Fill both blanks using the reusable code-question component.",
  "code:",
  "```javascript",
  "const response = await fetch([[endpoint]], { method: [[method]] });",
  "```",
  "answers:",
  "- endpoint | \"/api/users\"",
  "- method | \"GET\"",
  "options:",
  "- `\"POST\"`",
  "- `\"/api/users\"`",
  "- `\"GET\"`",
  "- `\"/api/posts\"`",
  "explanation: The browser sends a GET request to `/api/users`.",
  "hint: The endpoint is the first argument and the method belongs in the options object.",
  ":::",
  "",
  ":::code-question",
  "title: Build an explorer card",
  "instructions:",
  "Update the reusable starter files. The preview changes as you type, and the application checks the result without lesson-authored UI code.",
  "requirements:",
  "- Keep the explorer name inside an `<h1>` element.",
  "- Change the name to `Mira the Explorer` with that exact capitalization.",
  "- Add a card background with `background` or `background-color`.",
  "html:",
  "```html",
  "<article class=\"explorer-card\">",
  "  <h1>Mira</h1>",
  "  <p>Level 4 · CSS Ranger</p>",
  "</article>",
  "```",
  "css:",
  "```css",
  ".explorer-card {",
  "  padding: 24px;",
  "  border-radius: 16px;",
  "}",
  "```",
  "js:",
  "```javascript",
  "console.log(\"Explorer card ready\");",
  "```",
  "checks:",
  "- html-selector | h1",
  "- file-contains | html | Mira the Explorer | case-sensitive",
  "- css-property | background, background-color",
  ":::",
].join("\n");

function readSavedDraft() {
  try { return sessionStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function saveDraft(markdown) {
  try { sessionStorage.setItem(STORAGE_KEY, markdown); } catch { /* Storage is optional. */ }
}

export function renderMarkdownLab(container) {
  const controller = new AbortController();
  const { signal } = controller;
  const backButton = document.querySelector(".lesson-back");
  const lessonStatus = document.querySelector(".lesson-status");
  const previousBackText = backButton?.textContent;
  const previousBackLabel = backButton?.getAttribute("aria-label");
  const previousStatusHtml = lessonStatus?.innerHTML;
  const previousStatusHidden = lessonStatus?.hidden;

  document.body.classList.add("ui-lab-open", "ui-lab-markdown-open");
  backButton.textContent = "×";
  backButton.setAttribute("aria-label", "Close Markdown Lab");
  lessonStatus.hidden = true;
  container.innerHTML = `
    <section class="markdown-lab" aria-label="Lesson authoring workspace">
      <div class="markdown-settings-layer" data-markdown-settings-layer hidden>
        <section class="markdown-settings-panel" id="markdown-settings-panel" role="dialog" aria-modal="true" aria-labelledby="markdown-settings-title">
          <header><div><p>UI LAB · LESSON CONTENT SYSTEM</p><h1 id="markdown-settings-title">Content in. Reusable UI out.</h1><span>Write Markdown and structured question directives. The lesson shell and component layout stay application-owned.</span></div><button type="button" data-markdown-settings-close aria-label="Close settings">×</button></header>
          <div class="markdown-lab-actions">
            <label class="markdown-theme-picker"><span>COLOR THEME</span><select data-markdown-week aria-label="Preview week color theme">${WEEK_OPTIONS}</select></label>
            <button type="button" data-markdown-sample>LOAD COMPLETE SAMPLE</button><button type="button" data-markdown-clear>CLEAR</button>
          </div>
          <div class="markdown-settings-features" aria-label="Supported lesson authoring features"><span>MARKDOWN</span><span>CALLOUTS</span><span>TECH TERMS</span><span>IMAGES</span><span>YOUTUBE</span><span>MCQ</span><span>TRUE / FALSE</span><span>EXPLAIN IT</span><span>ORDERING</span><span>FILL BLANKS</span><span>SPOT BUG</span><span>CODE EDITOR</span><span>SANITIZED OUTPUT</span></div>
        </section>
      </div>
      <div class="markdown-lab-tabs" role="tablist" aria-label="Markdown workspace view">
        <button id="markdown-editor-tab" type="button" role="tab" aria-selected="true" aria-controls="markdown-editor-pane" data-markdown-pane="editor">WRITE</button>
        <button id="markdown-preview-tab" type="button" role="tab" aria-selected="false" aria-controls="markdown-preview-pane" data-markdown-pane="preview" tabindex="-1">PREVIEW</button>
      </div>
      <div class="markdown-lab-workspace" data-active-pane="editor">
        <section class="markdown-lab-pane markdown-lab-editor" id="markdown-editor-pane" role="tabpanel" aria-labelledby="markdown-editor-tab markdown-editor-label">
          <header><strong id="markdown-editor-label">LESSON MARKDOWN</strong><div class="markdown-editor-meta"><span data-markdown-count>0 CHARACTERS</span><button type="button" data-markdown-settings aria-controls="markdown-settings-panel" aria-expanded="false">SETTINGS</button></div></header>
          <textarea data-markdown-input aria-label="Lesson Markdown source" spellcheck="true" placeholder="# Lesson title\n\nWrite content, then add :::mcq and other supported directives."></textarea>
        </section>
        <section class="markdown-lab-pane markdown-lab-preview" id="markdown-preview-pane" role="tabpanel" aria-labelledby="markdown-preview-tab markdown-preview-label">
          <header><strong id="markdown-preview-label">RENDERED</strong><div class="markdown-preview-modes" role="group" aria-label="Preview format"><button type="button" class="is-active" data-preview-mode="lesson">LESSON</button><button type="button" data-preview-mode="document">DOCUMENT</button><button type="button" data-full-preview aria-pressed="false">FULL PAGE</button></div><span class="markdown-render-status" data-render-status role="status" aria-live="polite"><i></i>READY</span></header>
          <div class="markdown-preview-scroll"><div data-markdown-output></div></div>
        </section>
      </div>
    </section>`;

  const input = container.querySelector("[data-markdown-input]");
  const output = container.querySelector("[data-markdown-output]");
  const count = container.querySelector("[data-markdown-count]");
  const status = container.querySelector("[data-render-status]");
  const workspace = container.querySelector(".markdown-lab-workspace");
  const previewScroll = container.querySelector(".markdown-preview-scroll");
  const paneButtons = [...container.querySelectorAll("[data-markdown-pane]")];
  const modeButtons = [...container.querySelectorAll("[data-preview-mode]")];
  const weekSelect = container.querySelector("[data-markdown-week]");
  let previewMode = "lesson";
  let fullPreview = false;
  let activeStep = 0;
  let renderFrame = 0;
  let destroyStep = () => {};

  const setSettingsOpen = (open) => {
    const layer = container.querySelector("[data-markdown-settings-layer]");
    const toggle = container.querySelector("[data-markdown-settings]");
    layer.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) container.querySelector("[data-markdown-settings-close]").focus();
    else toggle.focus({ preventScroll:true });
  };

  const syncFullscreenButtons = () => {
    const toolbarButton = container.querySelector("[data-full-preview]");
    toolbarButton.setAttribute("aria-pressed", String(fullPreview));
    toolbarButton.textContent = fullPreview ? "EXIT FULL PAGE" : "FULL PAGE";
    container.querySelectorAll("[data-rendered-fullscreen]").forEach((button) => {
      button.textContent = fullPreview ? "×" : "⛶";
      button.setAttribute("aria-label", fullPreview ? "Exit full-page lesson preview" : "Open full-page lesson preview");
      button.setAttribute("aria-pressed", String(fullPreview));
    });
  };

  const setFullPreview = (active) => {
    const wasFullPreview = fullPreview;
    fullPreview = Boolean(active && previewMode === "lesson");
    document.body.classList.toggle("markdown-full-preview-open", fullPreview);
    syncFullscreenButtons();
    if (fullPreview) setActivePane("preview");
    else if (wasFullPreview) setActivePane("editor");
  };

  const setActivePane = (pane, { focus = false } = {}) => {
    workspace.dataset.activePane = pane;
    paneButtons.forEach((button) => {
      const selected = button.dataset.markdownPane === pane;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (selected && focus) button.focus();
    });
  };

  const renderLessonStep = (parsed) => {
    activeStep = Math.min(activeStep, parsed.steps.length);
    const complete = activeStep === parsed.steps.length;
    const step = parsed.steps[activeStep];
    const issueMarkup = parsed.issues.length ? `<details class="markdown-authoring-issues"><summary>${parsed.issues.length} authoring ${parsed.issues.length === 1 ? "issue" : "issues"}</summary><ul>${parsed.issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul></details>` : "";
    const progressValue = complete ? parsed.steps.length : activeStep + 1;
    const progressPercent = (progressValue / parsed.steps.length) * 100;
    output.className = "markdown-lesson-preview";
    output.innerHTML = `${issueMarkup}<div class="markdown-rendered-shell"><header class="markdown-rendered-top"><div class="markdown-rendered-progress" role="progressbar" aria-label="Authored lesson preview progress" aria-valuemin="0" aria-valuemax="${parsed.steps.length}" aria-valuenow="${progressValue}"><i style="--rendered-progress:${progressPercent}%"></i></div><button type="button" data-rendered-fullscreen aria-pressed="${fullPreview}" aria-label="${fullPreview ? "Exit" : "Open"} full-page lesson preview">${fullPreview ? "×" : "⛶"}</button></header><div data-authored-step></div></div>`;
    output.querySelector("[data-rendered-fullscreen]").addEventListener("click", () => setFullPreview(!fullPreview), { signal });
    const host = output.querySelector("[data-authored-step]");
    const goBack = () => { if (activeStep > 0) { activeStep -= 1; render(); } };
    const goNext = () => { if (activeStep < parsed.steps.length) { activeStep += 1; render(); } };
    if (complete) {
      host.innerHTML = renderTemplateShell({
        titleId:"authored-preview-complete",
        showScrollIndicator:false,
        content:'<div class="level-lesson-copy ready-lesson-result"><p class="level-layout-kicker">LESSON PREVIEW COMPLETE</p><h1 id="authored-preview-complete">Every step used the shared renderer</h1><p>Return to the source to keep authoring, or restart the interactive preview.</p></div>',
        footer:renderTemplateFooter({ backAttributes:{ disabled:false }, primaryLabel:"RESTART PREVIEW" }),
      });
      host.querySelector("[data-template-back]").addEventListener("click", goBack, { signal });
      host.querySelector("[data-template-primary]").addEventListener("click", () => { activeStep = 0; render(); }, { signal });
      return;
    }
    if (step.type === "code-question") {
      let disposed = false;
      let destroyCodeQuestion = () => {};
      host.classList.add("lesson-card--design-system", "lesson-card--ui-lab");
      host.innerHTML = '<div class="markdown-empty"><strong>Loading the code editor…</strong></div>';
      destroyStep = () => {
        disposed = true;
        destroyCodeQuestion();
        host.classList.remove("lesson-card--design-system", "lesson-card--ui-lab");
      };
      void loadDesignSystem().then(({ renderDesignSystem }) => {
        if (disposed) return;
        destroyCodeQuestion = renderDesignSystem(host, {
          practiceOnly:true,
          practice:step.content,
          embedded:true,
          onBack:goBack,
          onContinue:goNext,
        });
        host.querySelector("[data-template-back]").disabled = activeStep === 0;
      }).catch((error) => {
        if (disposed) return;
        console.error("The authored code question could not be rendered.", error);
        host.innerHTML = '<div class="markdown-empty markdown-empty--error" role="alert"><strong>The code editor could not load</strong><p>Refresh and try again.</p></div>';
      });
      return;
    }
    if (step.type !== "markdown") {
      destroyStep = renderUiLab(host, { definition:step, embedded:true, onBack:goBack, onContinue:goNext });
      host.querySelector("[data-template-back]").disabled = activeStep === 0;
      return;
    }
    const titleId = `authored-markdown-title-${activeStep}`;
    host.innerHTML = renderTemplateShell({
      titleId,
      content:`<article class="level-lesson-copy ready-lesson-copy markdown-authored-content"><p class="level-layout-kicker">LESSON · EXPLANATION</p><h1 class="visually-hidden" id="${titleId}">${escapeHtml(step.title)}</h1><div class="markdown-rendered">${renderMarkdownDocument(step.source)}</div></article>`,
      footer:renderTemplateFooter({ backAttributes:{ disabled:activeStep === 0 }, primaryLabel:"CONTINUE" }),
    });
    mountMarkdownFeatures(host, { signal, scrollSurface:previewScroll });
    host.querySelector("[data-template-back]").addEventListener("click", goBack, { signal });
    host.querySelector("[data-template-primary]").addEventListener("click", goNext, { signal });
  };

  const render = () => {
    renderFrame = 0;
    destroyStep();
    destroyStep = () => {};
    const source = input.value;
    count.textContent = `${source.length.toLocaleString()} ${source.length === 1 ? "CHARACTER" : "CHARACTERS"}`;
    saveDraft(source);
    if (!source.trim()) {
      output.className = "";
      output.innerHTML = `<div class="markdown-empty"><strong>Your lesson preview is ready</strong><p>Write Markdown or load the complete sample.</p></div>`;
      status.innerHTML = "<i></i>WAITING";
      return;
    }
    try {
      const parsed = parseLessonMarkdown(source);
      if (previewMode === "document") {
        output.className = "markdown-rendered";
        output.innerHTML = renderMarkdownDocument(parsed.documentSource);
        mountMarkdownFeatures(output, { signal, scrollSurface:previewScroll });
      } else renderLessonStep(parsed);
      status.innerHTML = `<i></i>${parsed.steps.length} ${parsed.steps.length === 1 ? "STEP" : "STEPS"}${parsed.issues.length ? ` · ${parsed.issues.length} ISSUES` : ""}`;
    } catch (error) {
      console.error("Lesson Markdown could not be rendered.", error);
      output.className = "";
      output.innerHTML = `<div class="markdown-empty markdown-empty--error" role="alert"><strong>This lesson could not render</strong><p>Check the authoring syntax and try again.</p></div>`;
      status.innerHTML = "<i></i>ERROR";
    }
  };
  const scheduleRender = () => { window.cancelAnimationFrame(renderFrame); renderFrame = window.requestAnimationFrame(render); };

  input.value = readSavedDraft() ?? SAMPLE_LESSON_MARKDOWN;
  weekSelect.value = document.documentElement.dataset.questWeek || "1";
  input.addEventListener("input", () => { activeStep = 0; scheduleRender(); }, { signal });
  container.querySelector("[data-markdown-sample]").addEventListener("click", () => { input.value = SAMPLE_LESSON_MARKDOWN; activeStep = 0; setSettingsOpen(false); scheduleRender(); input.focus(); }, { signal });
  container.querySelector("[data-markdown-clear]").addEventListener("click", () => { input.value = ""; activeStep = 0; setSettingsOpen(false); scheduleRender(); input.focus(); }, { signal });
  container.querySelector("[data-markdown-settings]").addEventListener("click", () => setSettingsOpen(true), { signal });
  container.querySelector("[data-markdown-settings-close]").addEventListener("click", () => setSettingsOpen(false), { signal });
  container.querySelector("[data-markdown-settings-layer]").addEventListener("click", (event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }, { signal });
  container.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !container.querySelector("[data-markdown-settings-layer]").hidden) { event.preventDefault(); setSettingsOpen(false); }
    else if (event.key === "Escape" && fullPreview) { event.preventDefault(); setFullPreview(false); }
  }, { signal });
  modeButtons.forEach((button) => button.addEventListener("click", () => {
    previewMode = button.dataset.previewMode;
    if (previewMode !== "lesson") setFullPreview(false);
    container.querySelector("[data-full-preview]").hidden = previewMode !== "lesson";
    modeButtons.forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
    render();
  }, { signal }));
  container.querySelector("[data-full-preview]").addEventListener("click", () => setFullPreview(!fullPreview), { signal });
  paneButtons.forEach((button) => button.addEventListener("click", () => setActivePane(button.dataset.markdownPane), { signal }));
  container.querySelector(".markdown-lab-tabs").addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const currentIndex = paneButtons.indexOf(event.target.closest("[data-markdown-pane]"));
    if (currentIndex < 0) return;
    event.preventDefault();
    let nextIndex = event.key === "Home" ? 0 : paneButtons.length - 1;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + paneButtons.length) % paneButtons.length;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % paneButtons.length;
    setActivePane(paneButtons[nextIndex].dataset.markdownPane, { focus:true });
  }, { signal });
  weekSelect.addEventListener("change", () => applyWeekTheme(Number(weekSelect.value)), { signal });
  render();

  return () => {
    window.cancelAnimationFrame(renderFrame);
    destroyStep();
    controller.abort();
    document.body.classList.remove("markdown-full-preview-open", "ui-lab-markdown-open", "ui-lab-open");
    backButton.textContent = previousBackText;
    if (previousBackLabel === null) backButton.removeAttribute("aria-label"); else backButton.setAttribute("aria-label", previousBackLabel);
    lessonStatus.innerHTML = previousStatusHtml;
    lessonStatus.hidden = previousStatusHidden;
  };
}
