import { COURSE_WEEKS, WEEK_THEMES } from "../data/course.js";
import { SHIP_READY_TEMPLATES } from "../data/ship-ready.js";
import { escapeHtml, prefersReducedMotion } from "../lib/dom.js";
import { highlightCode } from "../lib/prism.js";
import { mountMarkdownFeatures, renderMarkdownDocument } from "../markdown/renderer.js";
import { createCodePreviewDocument, PREVIEW_MESSAGE_SOURCE } from "./code-preview.js";
import { trapTabKey } from "./dialog.js";
import { launchCelebration } from "./celebration.js";
import { renderTemplateFooter } from "./template-shell.js";

const SPACES = [8, 12, 16, 24, 32];
const CORE_COLORS = [
  ["Canvas", "#fafafa"], ["Surface", "#f8f8f8"], ["Block", "#e8e8e8"],
  ["Stroke", "#d4d4d4"], ["Muted text", "#626b76"], ["Body text", "#68717a"],
];
const CONTRAST_PAIRS = [
  ["Body", "#68717a", "#fafafa", "4.75:1"],
  ["Lesson ink", "#3f4852", "#ffffff", "9.29:1"],
  ["Muted", "#626b76", "#ffffff", "5.41:1"],
  ["Warm action", "#49351f", "#c7a77b", "5.10:1"],
  ["Success", "#315f26", "#e5f7dc", "6.68:1"],
  ["Error", "#8a4e59", "#fff0f3", "5.74:1"],
  ["Code", "#d4d4d4", "#2d2d2d", "9.29:1"],
];
const FONT_OPTIONS = [
  ["Bungee", "Quest title", "Strong, angular, arcade display"],
  ["Fredoka", "Lesson heading", "Friendly, rounded, highly readable"],
  ["Lilita One", "Level unlocked", "Playful and compact display"],
  ["Titan One", "Boss quest", "Bold, bubbly reward moments"],
  ["Rowdies", "New adventure", "Energetic fantasy character"],
  ["Baloo 2", "Build your streak", "Warm, soft, flexible heading"],
  ["Nunito", "Keep learning every day", "Clean rounded interface text"],
];
const HTML_LOGO_SVG = `<svg class="ds-language-logo" viewBox="0 0 512 512" aria-hidden="true"><path fill="#E34F26" d="M71 460 30 0h451l-41 460-185 52"/><path fill="#EF652A" d="m256 472 149-41 35-394H256"/><path fill="#EBEBEB" d="M256 208h-75l-5-58h80V94H114l1 15 14 156h127zm0 147h-1l-63-17-4-45h-56l7 89 116 32h1z"/><path fill="#FFF" d="M255 208v57h70l-7 73-63 17v59l116-32 1-10 13-149 2-15h-16zm0-114v56h137l1-12 3-29 1-15z"/></svg>`;
const CSS_LOGO_SVG = `<svg class="ds-language-logo" viewBox="0 0 512 512" aria-hidden="true"><path fill="#264DE4" d="M71.357 460.819 30.272 0h451.456l-41.129 460.746L255.724 512z"/><path fill="#2965F1" d="m405.388 431.408 35.148-393.73H256v435.146z"/><path fill="#EBEBEB" d="m124.46 208.59 5.065 56.517H256V208.59zM119.419 150.715H256V94.197H114.281zM256 355.372l-.248.066-62.944-16.996-4.023-45.076h-56.736l7.919 88.741 115.772 32.14.26-.073z"/><path fill="#FFF" d="M255.805 208.59v56.517H325.4l-6.56 73.299-63.035 17.013v58.8l115.864-32.112.85-9.549 13.28-148.792 1.38-15.176 10.203-114.393H255.805v56.518h79.639L330.3 208.59z"/></svg>`;
const JS_LOGO_SVG = `<svg class="ds-language-logo" viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="38" fill="#f7df1e"/><path fill="#191919" d="M275 397c10 17 22 29 43 29 18 0 29-9 29-22 0-16-12-21-32-30l-11-5c-32-14-54-31-54-68 0-34 26-60 66-60 29 0 49 10 64 36l-35 23c-8-14-17-20-29-20-13 0-22 8-22 20 0 14 9 20 29 29l11 5c38 16 59 33 59 70 0 40-31 62-74 62-42 0-68-20-81-48zm-157 4c7 13 14 24 29 24 14 0 23-6 23-29V243h44v154c0 46-27 67-66 67-35 0-56-18-66-40z"/></svg>`;
const CAST_ICON_PATHS = '<path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/><path d="M2 12a9 9 0 0 1 8 8"/><path d="M2 16a5 5 0 0 1 4 4"/><line x1="2" x2="2.01" y1="20" y2="20"/>';
const LESSON_VIDEO = Object.freeze({
  title:"HTTP Crash Course & Exploration",
  creator:"Traversy Media",
  watchUrl:"https://www.youtube.com/watch?v=iYM2zFP3Zn0&t=358s",
  embedUrl:"https://www.youtube-nocookie.com/embed/iYM2zFP3Zn0?start=358&cc_load_policy=1&cc_lang_pref=en&hl=en",
});
function renderCastIcon(className) {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${CAST_ICON_PATHS}</svg>`;
}

function renderCoreColors() {
  return CORE_COLORS.map(([name, color]) => `<div class="ds-swatch"><span style="background:${color}"></span><strong>${name}</strong><code>${color}</code></div>`).join("");
}

function renderWeekPalettes() {
  return WEEK_THEMES.map((theme, index) => {
    const colors = [theme.top, theme.middle, theme.bottom, theme.border, theme.base, theme.text];
    return `<article class="ds-palette"><div class="ds-palette-head"><strong>Week ${index + 1}</strong><span>${escapeHtml(COURSE_WEEKS[index].cardLabel.replace(/^Start Week \d+: /, ""))}</span></div><div class="ds-palette-colors">${colors.map((color) => `<span style="background:${color}" title="${color}"></span>`).join("")}</div><code>${colors.join(" · ")}</code></article>`;
  }).join("");
}

function renderSpacing() {
  return SPACES.map((space, index) => `<div class="ds-space"><span style="width:${space * 2}px"></span><strong>Space ${index + 1}</strong><code>${space}px</code></div>`).join("");
}

function renderFonts() {
  return FONT_OPTIONS.map(([font, sample, note]) => `<article class="ds-font-card"><span>${font}</span><strong style="font-family:'${font}',sans-serif">${sample}</strong><p>${note}</p></article>`).join("");
}

function renderContrastReference() {
  return `
    <article class="ds-panel ds-contrast-reference" data-contrast-reference>
      <header><div><p class="ds-eyebrow">FOREGROUND · BACKGROUND · RATIO</p><h3>Approved text pairs</h3></div><p>Normal text targets at least 4.5:1. Keep each foreground with its shown surface instead of treating either color as safe everywhere.</p></header>
      <div class="ds-contrast-grid">${CONTRAST_PAIRS.map(([name, foreground, background, ratio]) => `<section data-contrast-pair data-foreground="${foreground}" data-background="${background}" data-ratio="${ratio}" style="--pair-fg:${foreground};--pair-bg:${background}"><div><strong>${name}</strong><span>Readable text</span></div><footer><code>${foreground} on ${background}</code><b>${ratio}</b></footer></section>`).join("")}</div>
      <section class="ds-system-colors" data-system-colors>
        <header><div><span>SYSTEM OVERRIDE CHECK</span><h4>State survives color replacement</h4></div><p>Boundaries, text, and native semantics keep each state clear when authored fills and shadows are replaced.</p></header>
        <div class="ds-system-color-strip">
          <div class="ds-system-color-state" data-system-color-state="focus"><span>FOCUS</span><button class="ds-button ds-button--primary" type="button">CONTINUE</button></div>
          <div class="ds-system-color-state" data-system-color-state="selection"><span>SELECTION</span><label><input type="checkbox" checked /><b>Selected choice</b></label></div>
          <div class="ds-system-color-state" data-system-color-state="invalid"><label for="ds-system-color-url">INVALID FIELD</label><input id="ds-system-color-url" value="api.test" aria-invalid="true" aria-describedby="ds-system-color-error" /><small id="ds-system-color-error">Error: use an HTTPS URL.</small></div>
          <div class="ds-system-color-state" data-system-color-state="progress"><span>PROGRESS</span><div class="ds-progress ds-system-color-progress" style="--progress:66.666%" role="progressbar" aria-label="Lesson progress: 2 of 3" aria-valuemin="0" aria-valuemax="3" aria-valuenow="2"><span class="ds-progress-fill"></span><b>2 OF 3</b></div></div>
        </div>
      </section>
    </article>`;
}

function renderSystemStates() {
  return `
    <article class="ds-panel ds-state-patterns">
      <header class="ds-state-patterns-head"><div><p class="ds-eyebrow">LEARNER STATE · ONE CLEAR NEXT STEP</p><h3>System feedback</h3></div><p>Keep context and explain what changed. Use Return for a safe escape, Retry only for recoverable failure, and Continue only when acknowledgement is required.</p></header>
      <div class="ds-state-grid">
        <section class="ds-state-card ds-state-card--loading" data-system-state="loading" aria-labelledby="ds-state-loading-title">
          <div class="ds-state-meta"><span>LOADING</span><b>PLEASE WAIT</b></div><h4 id="ds-state-loading-title">Preparing your next quest</h4><p>Keep the current path visible while lesson content arrives.</p><div class="ds-state-meter" role="progressbar" aria-label="Preparing lesson content"><span></span></div>
        </section>
        <section class="ds-state-card ds-state-card--empty" data-system-state="empty" aria-labelledby="ds-state-empty-title">
          <div class="ds-state-meta"><span>EMPTY</span><b>SAFE EXIT</b></div><h4 id="ds-state-empty-title">No lesson is published here yet</h4><p>Say what is missing without making the learner feel at fault.</p><button class="ds-button ds-button--secondary" type="button">RETURN TO PATH</button>
        </section>
        <section class="ds-state-card ds-state-card--error" data-system-state="error" aria-labelledby="ds-state-error-title">
          <div class="ds-state-meta"><span>ERROR</span><b>RECOVERABLE</b></div><h4 id="ds-state-error-title">This quest could not load</h4><p>Keep progress safe, name the failure plainly, and offer one retry.</p><button class="ds-button ds-button--secondary" type="button">TRY AGAIN</button>
        </section>
        <section class="ds-state-card ds-state-card--success" data-system-state="success" aria-labelledby="ds-state-success-title">
          <div class="ds-state-meta"><span>SUCCESS</span><b>NEXT STEP READY</b></div><h4 id="ds-state-success-title">Checkpoint saved</h4><p>Confirm the result once, then return attention to the next useful step.</p><button class="ds-button ds-button--primary" type="button">CONTINUE</button>
        </section>
      </div>
    </article>`;
}

function renderKeyboardReference() {
  const contracts = [
    ["Tab · Shift + Tab", "Next or previous native control.", "Nothing routine; the focus ring gives location."],
    ["Enter · Space", "The disclosure trigger stays put.", "Expose native expanded or collapsed state."],
    ["Arrow keys", "The next radio takes focus and selection.", "Provide its group legend and option label."],
    ["Invalid submit", "Move only when help locating the first error is needed.", "One concise error, once."],
    ["Escape", "Close a modal or overlay; restore its opener.", "In the editor, Escape then Tab leaves."],
    ["Successful submit", "Keep context; Continue follows naturally.", "Announce the result once, then stay quiet."],
  ];
  return `
    <article class="ds-panel ds-keyboard-reference" data-keyboard-reference>
      <header class="ds-keyboard-reference-head"><div><p class="ds-eyebrow">KEYBOARD · FOCUS · ANNOUNCEMENT</p><h3>Keyboard journey</h3></div><p>Prefer native behavior. Focus, selection, validation, and results must remain distinct without relying on color.</p></header>
      <div class="ds-keyboard-preview">
        <details class="ds-keyboard-disclosure" open><summary data-keyboard-focus-target>MORE CONTEXT</summary><p>Toggle with Enter or Space. Focus stays on this trigger.</p></details>
        <section class="ds-keyboard-choice-cell"><fieldset class="ds-keyboard-choice"><legend>Native choice group</legend><label><input type="radio" name="keyboard-return" value="trigger" checked /> <span>Return focus to the trigger</span></label><label><input type="radio" name="keyboard-return" value="heading" /> <span>Move to the page heading</span></label></fieldset></section>
        <section class="ds-keyboard-result" aria-labelledby="ds-keyboard-result-title"><p class="ds-eyebrow" id="ds-keyboard-result-title">POLITE RESULT</p><p role="status" aria-live="polite" aria-atomic="true">Answer checked. The trigger is correct.</p><button class="ds-button ds-button--primary" type="button">CONTINUE</button></section>
      </div>
      <dl class="ds-keyboard-contract" aria-label="Keyboard focus and announcement contract">${contracts.map(([key, focus, announcement]) => `<div><dt>${key}</dt><dd><strong>Focus</strong><span>${focus}</span><strong>Announce</strong><span>${announcement}</span></dd></div>`).join("")}</dl>
    </article>`;
}

function renderMotionReference() {
  const roles = [
    ["Interaction response", "120–220ms", "Hover, focus, press", "Immediate visual state"],
    ["Status and progress", "1.05s reveal", "Progress clarifies change", "Static state with persistent text"],
    ["Answer feedback", "420ms", "Small correct or retry response", "Immediate semantic result"],
    ["Spatial continuity", "320–520ms", "Reorder or completion continuity", "Immediate change; preserve focus"],
    ["Celebration", "560ms+", "Optional confetti after success", "Omit motion; retain success text"],
  ];
  return `
    <article class="ds-panel ds-motion-reference" data-motion-reference>
      <header class="ds-motion-reference-head"><div><p class="ds-eyebrow">ROLE · CURRENT EXAMPLE · FALLBACK</p><h3>Motion contract</h3></div><p>Roles govern behavior; timing stays contextual. Movement may clarify change, but reduced motion preserves the same content, focus, and outcome.</p></header>
      <div class="ds-motion-comparison">
        <section><header><span>STANDARD</span><b>USER TRIGGERED</b></header><p>Motion supports orientation.</p><div class="ds-motion-meter" role="progressbar" aria-label="Standard checkpoint complete" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><span data-motion-standard></span><b>100%</b></div></section>
        <section><header><span>REDUCED</span><b>SAME OUTCOME</b></header><p>State updates without movement.</p><div class="ds-motion-meter" role="progressbar" aria-label="Reduced-motion checkpoint complete" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><span data-motion-reduced></span><b>100%</b></div></section>
      </div>
      <div class="ds-motion-actions"><button class="ds-button ds-button--secondary" type="button" data-motion-replay>REPLAY COMPARISON</button><p aria-live="polite" data-motion-status>Nothing moves until replay is requested.</p></div>
      <dl class="ds-motion-contract">${roles.map(([role, duration, standard, reduced], index) => `<div><dt><span>${String(index + 1).padStart(2, "0")}</span><strong>${role}</strong><small><b>Current</b>${duration}</small></dt><dd><div><b>Standard</b><span>${standard}</span></div><div><b>Reduced</b><span>${reduced}</span></div></dd></div>`).join("")}</dl>
    </article>`;
}

function renderFieldContract() {
  const rules = [
    ["Name", "Use a visible label; use a <code class=\"ds-inline-token\">legend</code> for a related choice group."],
    ["Describe", "List stable help and feedback IDs in the control’s <code class=\"ds-inline-token\">aria-describedby</code>."],
    ["Validate", "Add <code class=\"ds-inline-token\">aria-invalid</code> only after validation; pair color with plain text."],
    ["Focus", "After submit, move only to the first invalid field when help is needed."],
    ["Availability", "Text-like controls may use <code class=\"ds-inline-token\">readonly</code> and still focus and submit; <code class=\"ds-inline-token\">disabled</code> controls do neither."],
  ];
  return `
    <article class="ds-panel ds-field-contract" data-field-contract>
      <header class="ds-field-contract-head"><div><p class="ds-eyebrow">NAME · HELP · VALIDATION</p><h3>Field lifecycle</h3></div><p>Question layouts may differ, but every field keeps one accessible name, useful guidance, and concise feedback.</p></header>
      <div class="ds-field-contract-layout">
        <form class="ds-field-example" data-field-example novalidate>
          <div class="ds-field-example-meta"><span>LIVE EXAMPLE</span><b>REQUIRED</b></div>
          <label class="ds-field-label" for="ds-api-base"><span>API base URL</span><small>URL</small></label>
          <input class="ds-reasoning-input" id="ds-api-base" name="apiBase" type="url" autocomplete="url" aria-describedby="ds-api-base-help ds-api-base-feedback" required />
          <p class="ds-field-example-help" id="ds-api-base-help">Include <code class="ds-inline-token">https://</code> and omit the trailing slash.</p>
          <p class="ds-field-example-feedback" id="ds-api-base-feedback" aria-live="polite" data-field-feedback></p>
          <div class="ds-field-example-actions"><button class="ds-button ds-button--primary" type="submit">VALIDATE FIELD</button><button class="ds-button ds-button--secondary" type="reset">RESET</button></div>
        </form>
        <dl class="ds-field-rules">${rules.map(([name, rule], index) => `<div><dt><span>${String(index + 1).padStart(2, "0")}</span>${name}</dt><dd>${rule}</dd></div>`).join("")}</dl>
      </div>
    </article>`;
}

function renderContentResilience() {
  const fixtures = [
    {
      mode:"typical",
      label:"TYPICAL COPY",
      title:"Check the response",
      body:"Read the status before parsing the body.",
      token:"/api/profile",
      action:"REVIEW RESPONSE",
      error:"",
    },
    {
      mode:"stressed",
      label:"EXPANSION FIXTURE",
      title:"Check the complete server response before continuing",
      body:"Required guidance stays visible when lesson wording grows, without covering the error or pushing the action outside its own card.",
      token:"https://api.example.com/organizations/palestine-learning-cohort/responses/latest",
      action:"RETURN TO RESPONSE DETAILS",
      error:"Error: response body is not valid JSON.",
    },
  ];
  return `
    <article class="ds-panel ds-resilience" data-content-resilience>
      <header class="ds-resilience-head"><div><p class="ds-eyebrow">GROW · WRAP · CONTAIN</p><h3>Content resilience</h3></div><p>A stress fixture checks expansion behavior; it does not claim translation or localization readiness.</p></header>
      <div class="ds-resilience-layout">
        <div class="ds-resilience-fixtures">${fixtures.map(({ mode, label, title, body, token, action, error }) => `
          <section class="ds-resilience-fixture ds-resilience-fixture--${mode}" data-resilience-fixture="${mode}">
            <span>${label}</span><h4>${title}</h4><p data-resilience-copy>${body}</p>
            <code class="ds-resilience-token">${token}</code>
            ${error ? `<strong class="ds-resilience-error">${error}</strong>` : ""}
            <button class="ds-button ${mode === "stressed" ? "ds-button--primary" : "ds-button--secondary"}" type="button">${action}</button>
          </section>`).join("")}</div>
        <dl class="ds-resilience-rules">
          <div><dt>Grow</dt><dd>Use minimums; let essential regions gain height.</dd></div>
          <div><dt>Wrap</dt><dd>Never clamp required headings, guidance, errors, or actions.</dd></div>
          <div><dt>Contain</dt><dd>Wrap or locally scroll long URLs and code without page overflow.</dd></div>
          <div><dt>Target</dt><dd>Keep controls at least 44px after labels wrap.</dd></div>
        </dl>
      </div>
    </article>`;
}

function renderAssetContract() {
  return `
    <article class="ds-panel ds-asset-contract" data-asset-contract>
      <header><div><p class="ds-eyebrow">ROLE · NAME · DELIVERY</p><h3>Asset use contract</h3></div><p>Choose semantics where an asset is used. The same file may need different treatment in a different context.</p></header>
      <div class="ds-asset-role-grid">
        <section data-asset-role="decorative"><header><span>01</span><h4>Decorative</h4></header><div class="ds-asset-role-preview ds-asset-role-preview--biome"><img src="assets/biomes/1.png" width="941" height="1672" loading="lazy" decoding="async" alt="" /></div><dl><div><dt>Name</dt><dd>Use <code class="ds-inline-token">alt=""</code>; nearby semantics carry meaning.</dd></div><div><dt>Space</dt><dd>Keep intrinsic dimensions or a stable aspect ratio.</dd></div><div><dt>Load</dt><dd>Lazy-load when it starts below the fold.</dd></div></dl></section>
        <section data-asset-role="informative"><header><span>02</span><h4>Informative</h4></header><div class="ds-asset-role-preview ds-asset-role-preview--flag"><img src="assets/icons/palestinian_flag_transparent.png" width="256" height="256" loading="lazy" decoding="async" alt="Palestinian flag" /></div><dl><div><dt>Name</dt><dd>Write concise contextual alt text without repeating adjacent copy.</dd></div><div><dt>Space</dt><dd>Preserve dimensions while CSS controls responsive size.</dd></div><div><dt>Load</dt><dd>Prioritize only genuinely critical visible content.</dd></div></dl></section>
        <section data-asset-role="functional"><header><span>03</span><h4>Functional</h4></header><div class="ds-asset-role-preview ds-asset-role-preview--control"><button type="button"><img src="assets/course-cards/week1.png" width="1979" height="794" loading="lazy" decoding="async" alt="" /><span>OPEN WEEK 1</span></button></div><dl><div><dt>Name</dt><dd>The control owns the action name; avoid duplicate image alt.</dd></div><div><dt>Space</dt><dd>Reserve image space and keep a usable control target.</dd></div><div><dt>Load</dt><dd>Keep the text name usable if artwork arrives late.</dd></div></dl></section>
      </div>
    </article>`;
}

function renderSurfaceReference() {
  return `
    <article class="ds-panel ds-surface-reference">
      <header><div><p class="ds-eyebrow">SHAPE · DEPTH · OWNERSHIP</p><h3>Shape and elevation</h3></div><p>Use the quietest surface that still communicates grouping, interaction, or focus.</p></header>
      <div class="ds-surface-grid">
        <section class="ds-surface-sample" data-surface-role="inline"><header><span>01</span><div><h4>Inline</h4><code>6–10px radius · no lift</code></div></header><div class="ds-surface-demo ds-surface-demo--inline"><p>Lesson status <span>IN PROGRESS</span></p></div><dl><div><dt>Use</dt><dd>Compact context inside a line.</dd></div><div><dt>Avoid</dt><dd>Turning metadata into a floating card.</dd></div></dl></section>
        <section class="ds-surface-sample" data-surface-role="control"><header><span>02</span><div><h4>Control</h4><code>12–15px radius · 2–3px base</code></div></header><div class="ds-surface-demo ds-surface-demo--control"><button class="ds-button ds-button--primary" type="button">CONTINUE</button></div><dl><div><dt>Use</dt><dd>Tactile depth for an available action.</dd></div><div><dt>Avoid</dt><dd>Applying button lift to static content.</dd></div></dl></section>
        <section class="ds-surface-sample" data-surface-role="panel"><header><span>03</span><div><h4>Panel</h4><code>17–24px radius · soft shadow</code></div></header><div class="ds-surface-demo ds-surface-demo--panel"><article><strong>Lesson summary</strong><span>One focused content region</span></article></div><dl><div><dt>Use</dt><dd>Separate a meaningful content region.</dd></div><div><dt>Avoid</dt><dd>Nesting panels without new hierarchy.</dd></div></dl></section>
      </div>
    </article>`;
}

function renderProgressItem({ kind, title, value, count, reward }) {
  return `<div class="ds-challenge ds-challenge--${kind}"><div class="ds-challenge-name">${title}</div><span class="ds-reward">${reward}</span><div class="ds-progress" role="progressbar" aria-label="${title}: ${count}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><span class="ds-progress-fill" style="--progress:${value}%"></span><b>${count}</b></div></div>`;
}

function hasCssDeclaration(cssSource, properties) {
  let rules;
  try {
    if (typeof CSSStyleSheet === "function") {
      const stylesheet = new CSSStyleSheet();
      stylesheet.replaceSync(cssSource);
      rules = stylesheet.cssRules;
    } else {
      const parserDocument = document.implementation.createHTMLDocument("");
      const style = parserDocument.createElement("style");
      style.textContent = cssSource;
      parserDocument.head.append(style);
      rules = style.sheet?.cssRules;
    }
  } catch {
    return false;
  }

  const rulesHaveProperty = (rules) => [...rules].some((rule) => {
    if (properties.some((property) => rule.style?.getPropertyValue(property))) return true;
    return rule.cssRules ? rulesHaveProperty(rule.cssRules) : false;
  });
  return Boolean(rules) && rulesHaveProperty(rules);
}

function evaluateCodeCheck(check, values) {
  if (check.type === "html-selector") {
    try {
      return Boolean(new DOMParser().parseFromString(values.html, "text/html").querySelector(check.selector));
    } catch {
      return false;
    }
  }
  if (check.type === "css-property") return hasCssDeclaration(values.css, check.properties);
  if (check.type === "file-contains") {
    const source = String(values[check.file] || "");
    const expected = String(check.value || "");
    return check.caseSensitive === false
      ? source.toLocaleLowerCase().includes(expected.toLocaleLowerCase())
      : source.includes(expected);
  }
  return false;
}

function renderJavaScriptSnippet(filename, label, source) {
  return `<div class="ds-code-snippet"><div class="ds-code-snippet-head"><span>${filename}</span><b>JAVASCRIPT</b></div><pre class="ds-reasoning-code language-javascript" aria-label="${label}"><code class="language-javascript">${source}</code></pre></div>`;
}

function renderDocumentationFooter(useCase) {
  return `<footer class="ds-doc-footer"><p><strong>Best for:</strong> ${useCase}</p><button class="ds-button ds-button--secondary ds-question-back" type="button" data-question-back>BACK</button></footer>`;
}

function renderLessonVideoReference() {
  return `
    <section class="ds-doc-video" data-markdown-feature="video" data-lesson-video aria-labelledby="lesson-video-title">
      <header class="ds-doc-video-head"><div><p class="ds-doc-video-kicker">CURATED VIDEO · OPTIONAL REINFORCEMENT</p><h4 id="lesson-video-title">Inspect the response evidence</h4></div><span>START 05:58</span></header>
      <p>This selected segment reinforces how response headers, content types, and status codes connect to the checks in the code below. The written lesson remains complete if you skip the video.</p>
      <p class="ds-doc-video-cues"><strong>Watch for:</strong> how request evidence differs from response evidence; where the response identifies its content type and status; and which facts client code can inspect before parsing.</p>
      <div class="ds-doc-video-player" data-video-player>
        <button type="button" data-load-lesson-video aria-describedby="lesson-video-privacy"><span class="ds-doc-video-play" aria-hidden="true">PLAY</span><span><strong>Load “${escapeHtml(LESSON_VIDEO.title)}”</strong><small>${escapeHtml(LESSON_VIDEO.creator)} · YouTube</small></span></button>
      </div>
      <div class="ds-doc-video-meta" id="lesson-video-privacy"><p>YouTube loads only after you choose Play. Captions start on. If the player is unavailable, use the direct link.</p><a href="${escapeHtml(LESSON_VIDEO.watchUrl)}" target="_blank" rel="noopener noreferrer">Open on YouTube <span class="visually-hidden">in a new tab</span></a></div>
      <p class="ds-doc-video-caveat"><strong>Selection note:</strong> Strong public engagement and a direct concept match support this choice. The stable HTTP segment is useful; later 2019 Express and Postman material is not treated as current tool guidance.</p>
      <p class="ds-doc-video-prompt"><strong>After watching:</strong> Name the two pieces of response evidence you would inspect before parsing and explain what each one protects against.</p>
      <p class="visually-hidden" role="status" aria-live="polite" data-video-status></p>
    </section>`;
}

function mountLessonVideo(container, signal) {
  const video = container.querySelector("[data-lesson-video]");
  if (!video) return;
  const player = video.querySelector("[data-video-player]");
  const loadButton = video.querySelector("[data-load-lesson-video]");
  const status = video.querySelector("[data-video-status]");
  loadButton.addEventListener("click", () => {
    const iframe = document.createElement("iframe");
    iframe.className = "ds-doc-video-iframe";
    iframe.src = LESSON_VIDEO.embedUrl;
    iframe.title = `${LESSON_VIDEO.title} by ${LESSON_VIDEO.creator}`;
    iframe.width = "800";
    iframe.height = "450";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allow = "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    player.replaceChildren(iframe);
    status.textContent = "YouTube video player loaded.";
    iframe.focus();
  }, { signal, once:true });
}

function renderExplanationLayouts() {
  return `
    <article class="ds-panel ds-doc-layout ds-doc-layout--lesson-reference" id="lesson-content-reference">
      <div class="ds-doc-preview-note"><strong>LESSON LAYOUT PREVIEW</strong><span>Development reference · not published course content</span></div>
      <div class="ds-doc-page" data-lesson-layout>
        <header class="ds-doc-header">
          <div class="ds-doc-meta"><span>DAY 23 · WEB APIS</span><span>WORKING KNOWLEDGE</span><span>18–24 MIN</span></div>
          <p class="ds-doc-kicker">LESSON 03 OF 07</p>
          <h3>Read an API response safely</h3>
          <p class="ds-doc-lead">Decide whether a response is safe to read before your code tries to use its body.</p>
          <section class="ds-doc-orientation" aria-labelledby="lesson-outcome-title"><div><span>BY THE END</span><h4 id="lesson-outcome-title">You can inspect response evidence, choose the next action, and explain why parsing can fail.</h4></div><div class="ds-doc-progress"><span><b>2</b> of 5 sections</span><div role="progressbar" aria-label="Lesson preview progress: 2 of 5 sections" aria-valuemin="0" aria-valuemax="5" aria-valuenow="2"><span></span></div></div></section>
        </header>
        <div class="ds-doc-lesson-grid">
          <article class="ds-doc-content">
            <section id="response-meaning" data-markdown-feature="hierarchy"><p class="ds-doc-section-label">MENTAL MODEL</p><h4>The response is evidence, not a promise</h4><h5>Status before body</h5><p>A response can arrive successfully while the request itself failed. <strong>Check the status before parsing</strong>, <em>especially when an endpoint may return HTML errors</em>. The <a href="#lesson-content-reference">lesson reference</a> keeps that rule near identifiers such as <code class="ds-inline-token">response.ok</code><sup class="ds-doc-footnote-ref" id="lesson-footnote-ref"><a href="#lesson-footnote-1" aria-label="Read footnote 1">1</a></sup>.</p><p class="ds-doc-shortcut" data-markdown-feature="keyboard"><span>Run the example with</span><kbd>Ctrl</kbd><span aria-hidden="true">+</span><kbd>Enter</kbd>.</p></section>
            <blockquote data-markdown-feature="quote"><strong>KEEP THIS RULE</strong><p>Handle the evidence you received, not the response you expected.</p></blockquote>
            <hr data-markdown-feature="thematic-break" />
            <section id="response-process"><p class="ds-doc-section-label">SAFE PROCESS</p><h4>Follow and verify each decision</h4><p>Move in a deliberate order so a useful server error does not become a confusing parsing error.</p><div class="ds-doc-list-grid"><div><h5>Response sequence</h5><ol data-markdown-feature="ordered-list"><li>Inspect the response.<ul data-markdown-feature="nested-list"><li>Read the status.</li><li>Confirm the content type.</li></ul></li><li>Parse the body once.</li></ol></div><div><h5>Before you continue</h5><ul class="ds-doc-task-list" data-markdown-feature="task-list"><li><input type="checkbox" checked disabled aria-label="Success case tested" /><span>Success case tested</span></li><li><input type="checkbox" disabled aria-label="Error case not yet tested" /><span>Error case still needs a test</span></li></ul></div></div></section>
            <aside class="ds-doc-alert" data-markdown-feature="callout" aria-labelledby="lesson-callout-title"><strong id="lesson-callout-title">WATCH THE CAUSE</strong><p>If code calls <code class="ds-inline-token">response.json()</code> first, an HTML error page may hide the original HTTP failure behind a second error.</p></aside>
            <section id="response-evidence" data-markdown-feature="table"><p class="ds-doc-section-label">COMPARE THE EVIDENCE</p><h4>Let the status choose the next action</h4><div class="ds-doc-table-wrap" role="region" aria-label="HTTP response handling comparison" tabindex="0"><table><caption>Response handling</caption><thead><tr><th scope="col">Evidence</th><th scope="col">Meaning</th><th scope="col">Next action</th></tr></thead><tbody><tr><th scope="row"><code class="ds-inline-token">200</code></th><td>Request succeeded</td><td>Parse once</td></tr><tr><th scope="row"><code class="ds-inline-token">404</code></th><td>Resource missing</td><td>Show a useful error</td></tr><tr><th scope="row"><code class="ds-inline-token">500</code></th><td>Server failed</td><td>Offer retry</td></tr></tbody></table></div></section>
            <section data-markdown-feature="definitions"><h4>Two failures that look similar</h4><dl class="ds-doc-definitions"><dt>HTTP failure</dt><dd>The server responded with a non-success status.</dd><dt>Parse failure</dt><dd>The body does not match the format the reader expects.</dd></dl></section>
            <div id="response-video">${renderLessonVideoReference()}</div>
            <section id="response-example" data-markdown-feature="code-block"><p class="ds-doc-section-label">WORKED EXAMPLE</p><h4>Guard the body before parsing it</h4><p>Notice that the condition comes before <code class="ds-inline-token">response.json()</code>. That order preserves the most useful evidence.</p>${renderJavaScriptSnippet("load-profile.js", "JavaScript response handling example", `async function loadProfile() {
  const response = await fetch("/api/profile");
  if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
  return response.json();
}`)}<p class="ds-doc-example-result"><strong>Expected behavior:</strong> a failed status becomes an HTTP error; a successful JSON response is parsed once.</p></section>
            <details class="ds-doc-details" data-markdown-feature="details"><summary>Try one focused extension</summary><div><p>Change the path to a missing resource. Predict which line runs next, then compare the result with your prediction. This remains optional in the layout preview.</p></div></details>
            <section class="ds-doc-footnotes" data-markdown-feature="footnote" aria-label="Footnotes"><p class="ds-doc-section-label">REFERENCE</p><ol><li id="lesson-footnote-1">The Fetch API resolves normally for HTTP error statuses, so code must inspect the response status. <a href="#lesson-footnote-ref" aria-label="Back to footnote reference">↩</a></li></ol></section>
          </article>
        </div>
      </div>
      ${renderDocumentationFooter("a realistic lesson reading rhythm using the complete approved content vocabulary.")}
    </article>`;
}

function renderReasoningQuestionPatterns() {
  return `
    <article class="ds-panel ds-reasoning-panel" data-trace-question>
      <div class="ds-question-head"><div><p class="ds-eyebrow">TRACE IT · CONSTRUCTED RESPONSE</p><h3>Follow the state</h3></div><span class="ds-chip">+20 XP</span></div>
      <p class="ds-reasoning-prompt">Without running the code, write the value of <code class="ds-inline-token">total</code> after each loop pass.</p>
      <div class="ds-reasoning-workspace">
        ${renderJavaScriptSnippet("trace.js", "JavaScript to trace", `let total = 1;
for (const value of [2, 3, 4]) {
  total = value % 2 === 0
    ? total * value
    : total + value;
}`)}
        <form class="ds-reasoning-form" id="ds-trace-form" data-trace-form novalidate>
          <label class="ds-field-label" for="ds-trace-answer"><span>Your trace</span><small>3 values</small></label>
          <input class="ds-reasoning-input" id="ds-trace-answer" name="trace" autocomplete="off" inputmode="numeric" placeholder="Example: 2, 5, 20" aria-describedby="ds-trace-hint ds-trace-feedback" required />
          <p class="ds-reasoning-hint" id="ds-trace-hint">Separate the three values with commas. The intermediate states matter, not only the final output.</p>
        </form>
      </div>
      <div class="ds-pattern-actions"><span class="ds-pattern-feedback" id="ds-trace-feedback" aria-live="polite">Commit to a trace before checking.</span><div class="ds-question-actions"><button class="ds-button ds-button--secondary ds-question-back" type="button" data-question-back>BACK</button><button class="ds-button ds-button--primary" type="submit" form="ds-trace-form">CHECK TRACE</button></div></div>
    </article>

    <article class="ds-panel ds-reasoning-panel" data-parsons-question>
      <div class="ds-question-head"><div><p class="ds-eyebrow">RECONSTRUCT · DEPENDENCY ORDER</p><h3>Build the request flow</h3></div><span class="ds-chip">+20 XP</span></div>
      <p class="ds-reasoning-prompt">Put every line in the only safe execution order. Use data dependencies, not visual guesswork.</p>
      <ol class="ds-parsons-list" data-parsons-list aria-label="Code blocks to reorder">
        <li data-block-id="return"><span class="ds-parsons-position" aria-hidden="true"></span><code class="language-javascript">return profile.name;</code><div class="ds-parsons-controls"><button type="button" data-move="up" aria-label="Move return profile name up"><span aria-hidden="true">↑</span></button><button type="button" data-move="down" aria-label="Move return profile name down"><span aria-hidden="true">↓</span></button></div></li>
        <li data-block-id="request"><span class="ds-parsons-position" aria-hidden="true"></span><code class="language-javascript">const response = await fetch("/api/profile");</code><div class="ds-parsons-controls"><button type="button" data-move="up" aria-label="Move fetch request up"><span aria-hidden="true">↑</span></button><button type="button" data-move="down" aria-label="Move fetch request down"><span aria-hidden="true">↓</span></button></div></li>
        <li data-block-id="parse"><span class="ds-parsons-position" aria-hidden="true"></span><code class="language-javascript">const profile = await response.json();</code><div class="ds-parsons-controls"><button type="button" data-move="up" aria-label="Move parse profile up"><span aria-hidden="true">↑</span></button><button type="button" data-move="down" aria-label="Move parse profile down"><span aria-hidden="true">↓</span></button></div></li>
        <li data-block-id="guard"><span class="ds-parsons-position" aria-hidden="true"></span><code class="language-javascript">if (!response.ok) throw new Error("Request failed");</code><div class="ds-parsons-controls"><button type="button" data-move="up" aria-label="Move response guard up"><span aria-hidden="true">↑</span></button><button type="button" data-move="down" aria-label="Move response guard down"><span aria-hidden="true">↓</span></button></div></li>
      </ol>
      <div class="ds-pattern-actions"><span class="ds-pattern-feedback" data-parsons-feedback aria-live="polite">Order first, guard failures, parse once, then return the value.</span><div class="ds-question-actions"><button class="ds-button ds-button--secondary ds-question-back" type="button" data-question-back>BACK</button><button class="ds-button ds-button--primary" type="button" data-check-parsons>CHECK FLOW</button></div></div>
    </article>

    <article class="ds-panel ds-reasoning-panel" data-diagnosis-question>
      <div class="ds-question-head"><div><p class="ds-eyebrow">DEBUG · CLAIM + REPAIR</p><h3>Explain the evidence</h3></div><span class="ds-chip">+25 XP</span></div>
      <p class="ds-reasoning-prompt">The callbacks should return <code class="ds-inline-token">[0, 1, 2]</code>, but the test receives <code class="ds-inline-token">[3, 3, 3]</code>. Choose the cause and the smallest valid repair.</p>
      ${renderJavaScriptSnippet("handlers.js", "JavaScript with a closure bug", `const handlers = [];
for (var i = 0; i &lt; 3; i += 1) {
  handlers.push(() =&gt; i);
}
handlers.map((run) =&gt; run());`)}
      <form class="ds-diagnosis-form" id="ds-diagnosis-form" data-diagnosis-form>
        <fieldset><legend>Which claim explains all three observed values?</legend><label><input type="radio" name="cause" value="shared" /> <span><b><code class="ds-inline-token">var</code> creates one loop binding shared by every callback.</b><small>Each callback reads it after the loop finishes.</small></span></label><label><input type="radio" name="cause" value="eager" /> <span><b>The callbacks run eagerly inside <code class="ds-inline-token">push</code>.</b><small>The array stores their results instead of functions.</small></span></label><label><input type="radio" name="cause" value="map" /> <span><b><code class="ds-inline-token">map</code> always passes the final index to callbacks.</b><small>That index replaces the closed-over value.</small></span></label></fieldset>
        <fieldset><legend>What is the smallest repair for this loop?</legend><label><input type="radio" name="repair" value="let" /> <span><b>Replace <code class="ds-inline-token">var i</code> with <code class="ds-inline-token">let i</code>.</b><small>Each iteration gets its own binding.</small></span></label><label><input type="radio" name="repair" value="async" /> <span><b>Make every callback <code class="ds-inline-token">async</code>.</b><small>Promise timing will preserve each value.</small></span></label><label><input type="radio" name="repair" value="reverse" /> <span><b>Reverse the handlers before mapping.</b><small>The captured values will return to creation order.</small></span></label></fieldset>
      </form>
      <div class="ds-pattern-actions"><span class="ds-pattern-feedback" data-diagnosis-feedback aria-live="polite">A repair only counts when the explanation predicts the failure.</span><div class="ds-question-actions"><button class="ds-button ds-button--secondary ds-question-back" type="button" data-question-back>BACK</button><button class="ds-button ds-button--primary" type="submit" form="ds-diagnosis-form">CHECK REASONING</button></div></div>
    </article>

    <article class="ds-panel ds-reasoning-panel" data-boundary-question>
      <div class="ds-question-head"><div><p class="ds-eyebrow">DESIGN A TEST · COUNTEREXAMPLE</p><h3>Expose the boundary bug</h3></div><span class="ds-chip">+25 XP</span></div>
      <div class="ds-reasoning-workspace">
        <div class="ds-boundary-brief"><p class="ds-reasoning-prompt">Requirement: orders of $50 or more ship free. Give one input and expected result that fail with this implementation.</p>${renderJavaScriptSnippet("shipping.js", "Buggy JavaScript function", `function hasFreeShipping(total) {
  return total &gt; 50;
}`)}</div>
        <form class="ds-boundary-form" id="ds-boundary-form" data-boundary-form novalidate>
          <label class="ds-field-label" for="ds-boundary-input"><span>Order total</span><small>USD</small></label><input class="ds-reasoning-input" id="ds-boundary-input" name="total" type="number" min="0" step="0.01" required />
          <label class="ds-field-label" for="ds-boundary-expected"><span>Expected result</span><small>boolean</small></label><select class="ds-reasoning-input" id="ds-boundary-expected" name="expected" required><option value="">Choose…</option><option value="true">true</option><option value="false">false</option></select>
          <p class="ds-reasoning-hint">A strong test distinguishes the requirement from the code; ordinary passing examples do not expose the bug.</p>
        </form>
      </div>
      <div class="ds-pattern-actions"><span class="ds-pattern-feedback" data-boundary-feedback aria-live="polite">Find the exact value where <code class="ds-inline-token">&gt;</code> and “or more” disagree.</span><div class="ds-question-actions"><button class="ds-button ds-button--secondary ds-question-back" type="button" data-question-back>BACK</button><button class="ds-button ds-button--primary" type="submit" form="ds-boundary-form">CHECK TEST</button></div></div>
    </article>`;
}

export function renderDesignSystem(container, { practiceOnly = false, practice = null, embedded = false, onBack = null, onContinue = null } = {}) {
  const controller = new AbortController();
  const { signal } = controller;
  const disposers = [];
  const codeQuest = practice || SHIP_READY_TEMPLATES.find(({ renderer }) => renderer === "code").content;
  const codeQuestFooter = practiceOnly
    ? renderTemplateFooter({ className:"ds-quest-footer level-layout-actions", primaryLabel:"RUN CHECK", primaryAttributes:{ "data-run-code":true }, primaryTrailingContent:'<span class="ds-run-play" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M7.5 5.8v12.4c0 1.1 1.2 1.8 2.2 1.2l9.1-6.2c.8-.5.8-1.8 0-2.3L9.7 4.7c-1-.7-2.2 0-2.2 1.1Z" /></svg></span>', showShortcut:false })
    : `<div class="ds-quest-footer level-layout-actions"><div class="ds-question-actions"><button class="ds-button ds-button--secondary ds-question-back" type="button" data-question-back>BACK</button><button class="ds-button ds-button--primary ds-run-code" type="button" data-run-code><span>RUN CHECK</span><svg class="ds-run-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5.25 5.653C5.25 4.227 6.779 3.323 8.029 4.01l9.54 5.25c1.295.713 1.295 2.573 0 3.286l-9.54 5.25c-1.25.687-2.779-.217-2.779-1.643V5.653Z" /></svg></button></div></div>`;
  container.innerHTML = `
    <header class="ds-hero">
      <p class="ds-eyebrow">LEVEL 0 · LIVING REFERENCE</p>
      <h1>Full-Stack Quest Design System</h1>
      <p>The shared visual language for course maps, lessons, questions, progress, and rewards.</p>
    </header>

    <nav class="ds-jump" aria-label="Design system sections">
      <a href="#foundations">Foundations</a><a href="#palettes">Week palettes</a><a href="#assets">Assets</a><a href="#components">Components</a><a href="#questions">Questions</a><a href="#explanations">Explanations</a><a href="#interactive">Practice labs</a>
    </nav>

    <section class="ds-section" id="foundations">
      <div class="ds-section-head"><span>01</span><div><h2>Foundations</h2><p>Typography, neutral colors, spacing, shape, and elevation.</p></div></div>
      <div class="ds-grid ds-grid--two">
        <article class="ds-panel"><h3>Current pairing</h3><div class="ds-type-display">QUEST TITLE</div><div class="ds-type-heading">Lesson heading in Fredoka</div><p class="ds-type-body">Bungee creates the game identity. Fredoka keeps lesson headings friendly and readable.</p><code>Bungee · Fredoka 700</code></article>
        <article class="ds-panel"><h3>Spacing scale</h3><div class="ds-spacing">${renderSpacing()}</div></article>
      </div>
      <article class="ds-panel"><h3>Gamified font candidates</h3><p class="ds-panel-intro">Display fonts are best for short titles and rewards. Keep lesson paragraphs in a simpler rounded sans-serif.</p><div class="ds-font-grid">${renderFonts()}</div></article>
      <article class="ds-panel"><h3>Neutral palette</h3><div class="ds-swatches">${renderCoreColors()}</div></article>
      ${renderContrastReference()}
      ${renderSurfaceReference()}
    </section>

    <section class="ds-section" id="palettes">
      <div class="ds-section-head"><span>02</span><div><h2>Week palettes</h2><p>Each biome uses the same semantic color roles: top, middle, bottom, border, base, and text.</p></div></div>
      <div class="ds-palettes">${renderWeekPalettes()}</div>
    </section>

    <section class="ds-section" id="assets">
      <div class="ds-section-head"><span>03</span><div><h2>Production asset index</h2><p>Reference samples use the active filenames and preserve the map's existing artwork.</p></div></div>
      <div class="ds-grid ds-grid--two">
        <article class="ds-panel"><header class="ds-asset-card-head"><h3>Biome background</h3><span>DECORATIVE</span></header><img class="ds-asset-sample" src="assets/biomes/1.png" width="941" height="1672" loading="lazy" decoding="async" alt="" /><code>assets/biomes/1.png · 941 × 1672</code></article>
        <article class="ds-panel"><header class="ds-asset-card-head"><h3>Course card</h3><span>CONTROL ART</span></header><img class="ds-asset-sample" src="assets/course-cards/week1.png" width="1979" height="794" loading="lazy" decoding="async" alt="" /><code>assets/course-cards/week1.png · 1979 × 794</code></article>
        <article class="ds-panel"><header class="ds-asset-card-head"><h3>Navigation icon</h3><span>NAMED CONTROL</span></header><img class="ds-asset-sample ds-asset-sample--icon" src="assets/icons/code_book_transparent.png" width="256" height="256" loading="lazy" decoding="async" alt="" /><code>assets/icons/code_book_transparent.png</code></article>
        <article class="ds-panel"><header class="ds-asset-card-head"><h3>Rank icon</h3><span>TEXT-OWNED</span></header><img class="ds-asset-sample ds-asset-sample--icon" src="assets/icons/ranks/bronze.png" width="256" height="256" loading="lazy" decoding="async" alt="" /><code>assets/icons/ranks/bronze.png</code></article>
      </div>
      ${renderAssetContract()}
    </section>

    <section class="ds-section" id="components">
      <div class="ds-section-head"><span>04</span><div><h2>Controls and cards</h2><p>Reusable controls, containers, states, and interaction contracts.</p></div></div>
      <div class="ds-grid ds-grid--two">
        <article class="ds-panel"><h3>Actions</h3><div class="ds-actions"><button class="ds-button ds-button--primary" type="button">CONTINUE</button><button class="ds-button ds-button--secondary" type="button">BACK</button><button class="ds-button" type="button" disabled>LOCKED</button><span class="ds-chip">+20 XP</span><span class="ds-chip ds-chip--status">IN PROGRESS</span></div></article>
        <article class="ds-panel"><h3>Challenge progress</h3><div class="ds-challenge-list">${renderProgressItem({ kind:"book", title:"Complete 3 lessons", value:67, count:"2/3", reward:"20 XP" })}${renderProgressItem({ kind:"flame", title:"Keep your streak", value:28, count:"2/7", reward:"15 XP" })}${renderProgressItem({ kind:"gem", title:"Earn 50 XP today", value:40, count:"20/50", reward:"30 XP" })}</div></article>
        <article class="ds-panel ds-card-example"><p class="ds-eyebrow">DAILY LESSON</p><h3>Build with reusable pieces</h3><p>Lesson cards use quiet surfaces, generous padding, rounded corners, and a visible content hierarchy.</p></article>
        <article class="ds-panel"><h3>Resource card</h3><div class="ds-resource"><div><strong>Official learning source</strong><span>Open the reference for this lesson</span></div><b>↗</b></div></article>
        ${renderSystemStates()}
        ${renderKeyboardReference()}
        ${renderMotionReference()}
        ${renderFieldContract()}
        ${renderContentResilience()}
      </div>
    </section>

    <section class="ds-section" id="questions">
      <div class="ds-section-head"><span>05</span><div><h2>Question patterns</h2><p>One clear task, an obvious action, and feedback that explains the result.</p></div></div>
      <article class="ds-panel ds-question ds-question--mcq">
        <div class="ds-mcq-content">
          <div class="ds-question-head"><div><p class="ds-eyebrow">KNOWLEDGE CHECK · CHOOSE ONE</p><h3>HTTP responses</h3></div><span class="ds-chip">+10 XP</span></div>
          <p>Which status code best fits a successful POST request that created a new resource?</p>
          <div class="ds-answer-grid"><button class="ds-answer" type="button" aria-pressed="false"><span>A</span><b>200 OK</b></button><button class="ds-answer" type="button" aria-pressed="false"><span>B</span><b>204 No Content</b></button><button class="ds-answer" type="button" aria-pressed="false" data-correct="true"><span>C</span><b>201 Created</b></button><button class="ds-answer" type="button" aria-pressed="false"><span>D</span><b>404 Not Found</b></button></div>
        </div>
        <div class="ds-question-footer"><span class="ds-feedback" aria-live="polite">Select the best answer, then check your choice.</span><div class="ds-question-actions"><button class="ds-button ds-button--secondary ds-question-back" type="button" data-question-back>BACK</button><button class="ds-button ds-button--primary ds-check" type="button" disabled><span data-check-label>CHECK ANSWER</span><kbd aria-label="Enter key"><b>↵</b> ENTER</kbd></button></div></div>
      </article>
      <article class="ds-panel ds-response-panel">
        <div class="ds-question-head"><div><p class="ds-eyebrow">EXPLAIN IT · SHORT RESPONSE</p><h3>Request vs response</h3></div><span class="ds-chip">+15 XP</span></div>
        <form class="ds-response-form" data-response-form novalidate>
          <div class="ds-response-layout">
            <div class="ds-response-brief"><p>Explain the idea in your own words. Keep it clear, useful, and grounded in one example.</p><strong>A strong answer includes</strong><ul><li><span>1</span>What the client sends</li><li><span>2</span>What the server returns</li><li><span>3</span>One real example</li></ul></div>
            <div class="ds-response-answer">
            <label class="ds-field-label" for="ds-response"><span>Your explanation</span><small>2–3 sentences</small></label>
            <div class="ds-composer"><textarea id="ds-response" class="ds-textarea" maxlength="420" required placeholder="A request is what the client sends to a server..." aria-describedby="ds-response-help ds-response-feedback"></textarea><div class="ds-composer-footer"><span id="ds-response-help">Enter to submit · Shift+Enter for a new line</span><b><span data-response-count>0</span>/420</b></div></div>
            </div>
          </div>
          <div class="ds-response-submit-row"><span class="ds-response-feedback" id="ds-response-feedback" aria-live="polite"></span><div class="ds-question-actions"><button class="ds-button ds-button--secondary ds-question-back" type="button" data-question-back>BACK</button><button class="ds-button ds-button--primary ds-response-submit" type="submit"><span data-response-submit-label>SUBMIT EXPLANATION</span><kbd aria-label="Enter key"><b>↵</b> ENTER</kbd></button></div></div>
        </form>
      </article>
      ${renderReasoningQuestionPatterns()}
    </section>

    <section class="ds-section" id="explanations">
      <div class="ds-section-head"><span>06</span><div><h2>Lesson content reference</h2><p>One canonical explanation showing each approved Markdown-style primitive once.</p></div></div>
      ${renderExplanationLayouts()}
    </section>

    <section class="ds-section" id="interactive">
      <div class="ds-section-head"><span>07</span><div><h2>Practice labs</h2><p>Small, focused tools that let learners predict, change, run, and inspect real behavior.</p></div></div>

      <article class="ds-panel ds-interactive-panel ds-build-panel">
        <div class="ds-build-content" data-build-content>
          <aside class="ds-build-guide" aria-label="Quest instructions">
            <article class="markdown-rendered">${renderMarkdownDocument(codeQuest.instructions)}</article>
            <button class="ds-guide-scroll" type="button" data-guide-scroll aria-label="Show more instructions"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 9.5 5.5 5 5.5-5"/></svg></button>
          </aside>
          <div class="ds-build-resizer" data-build-resizer role="separator" tabindex="0" aria-label="Resize instructions and workspace" aria-orientation="vertical" aria-valuemin="300" aria-valuemax="1000" aria-valuenow="500"></div>
          <div class="ds-code-lab" data-code-lab>
            <section class="ds-editor-card" aria-label="Code editor">
              <header class="ds-editor-header"><div class="ds-editor-tabs" role="tablist" aria-label="Code files"><button class="is-active" id="code-tab-html" type="button" role="tab" data-editor-tab="html" aria-controls="code-panel-html" aria-label="Edit index.html" title="index.html" aria-selected="true">${HTML_LOGO_SVG}<span class="ds-editor-tab-label">index.html</span></button><button id="code-tab-css" type="button" role="tab" data-editor-tab="css" aria-controls="code-panel-css" aria-label="Edit styles.css" title="styles.css" aria-selected="false" tabindex="-1">${CSS_LOGO_SVG}<span class="ds-editor-tab-label">styles.css</span></button><button id="code-tab-js" type="button" role="tab" data-editor-tab="js" aria-controls="code-panel-js" aria-label="Edit script.js" title="script.js" aria-selected="false" tabindex="-1">${JS_LOGO_SVG}<span class="ds-editor-tab-label">script.js</span></button></div></header>
              <div class="ds-editor-host" id="code-panel-html" data-editor-host="html" role="tabpanel" aria-labelledby="code-tab-html"></div><div class="ds-editor-host" id="code-panel-css" data-editor-host="css" role="tabpanel" aria-labelledby="code-tab-css" hidden></div><div class="ds-editor-host" id="code-panel-js" data-editor-host="js" role="tabpanel" aria-labelledby="code-tab-js" hidden></div>
            </section>
            <div class="ds-lab-resizer" data-lab-resizer role="separator" tabindex="0" aria-label="Resize editor and preview" aria-orientation="vertical" aria-valuemin="280" aria-valuemax="1000" aria-valuenow="560"></div>
            <section class="ds-preview-card" aria-label="Code output"><header class="ds-preview-bar"><div class="ds-output-tabs" role="tablist" aria-label="Code output"><button class="is-active" id="output-tab-preview" type="button" role="tab" data-output-tab="preview" aria-controls="output-panel-preview" aria-selected="true">PREVIEW</button><button id="output-tab-console" type="button" role="tab" data-output-tab="console" aria-controls="output-panel-console" aria-selected="false" tabindex="-1">CONSOLE <span data-console-count hidden>0</span></button></div><b>${renderCastIcon("ds-preview-live-icon")} LIVE</b></header><div class="ds-output-panel" id="output-panel-preview" data-output-panel="preview" role="tabpanel" aria-labelledby="output-tab-preview"><iframe class="ds-live-preview" title="Live code preview" sandbox="allow-scripts"></iframe></div><div class="ds-output-panel ds-console" id="output-panel-console" data-output-panel="console" role="tabpanel" aria-labelledby="output-tab-console" hidden><div class="ds-console-toolbar"><span>JavaScript output</span><button type="button" data-clear-console>CLEAR</button></div><div class="ds-console-output" data-console-output role="log" aria-live="polite"><p class="ds-console-empty">Console output will appear here.</p></div></div></section>
          </div>
        </div>
        ${codeQuestFooter}
      </article>

    </section>
  `;

  container.classList.toggle("ds-practice-only", practiceOnly);
  if (practiceOnly) {
    const practiceSection = container.querySelector("#interactive");
    practiceSection?.querySelector(":scope > .ds-section-head")?.remove();
    practiceSection?.classList.add("ds-ready-content-area");
    container.querySelector("[data-template-back]")?.addEventListener("click", () => {
      if (embedded && typeof onBack === "function") onBack();
      else document.querySelector(".lesson-back")?.click();
    }, { signal });
  }

  // The design-system reference uses disclosures to keep its long document
  // scannable. UI Lab is a learner-facing level, so its single practice
  // section stays open like the ready-to-ship lesson templates.
  if (!practiceOnly) mountSectionCollapsers(container, signal);
  mountLessonVideo(container, signal);

  const answers = [...container.querySelectorAll(".ds-answer")];
  const check = container.querySelector(".ds-check");
  const feedback = container.querySelector(".ds-feedback");
  const setCheckLabel = (label) => { check.querySelector("[data-check-label]").textContent = label; };
  let selectedAnswer = null;
  answers.forEach((answer) => answer.addEventListener("click", () => {
    selectedAnswer = answer;
    answers.forEach((option) => option.classList.toggle("is-selected", option === answer));
    answers.forEach((option) => option.setAttribute("aria-pressed", String(option === answer)));
    answers.forEach((option) => option.classList.remove("is-correct", "is-wrong"));
    feedback.classList.remove("is-success", "is-error");
    check.disabled = false;
    setCheckLabel("CHECK ANSWER");
    feedback.textContent = "Answer selected. Check it when you are ready.";
  }, { signal }));

  check.addEventListener("click", () => {
    if (!selectedAnswer) return;
    const isCorrect = selectedAnswer.dataset.correct === "true";
    selectedAnswer.classList.add(isCorrect ? "is-correct" : "is-wrong");
    feedback.textContent = isCorrect ? "Correct — 201 means the request succeeded and created a resource." : "Not quite. Look for the success code specifically used when a resource is created.";
    feedback.classList.toggle("is-success", isCorrect);
    feedback.classList.toggle("is-error", !isCorrect);
    setCheckLabel(isCorrect ? "CORRECT!" : "TRY AGAIN");
    if (isCorrect) launchConfetti();
  }, { signal });

  container.querySelector(".ds-question--mcq").addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.repeat || !selectedAnswer || check.disabled || event.target.closest("button, input, textarea, a")) return;
    event.preventDefault();
    check.click();
  }, { signal });

  const responseForm = container.querySelector("[data-response-form]");
  const response = container.querySelector("#ds-response");
  const responseCount = container.querySelector("[data-response-count]");
  const responseSubmit = container.querySelector(".ds-response-submit");
  const setResponseSubmitLabel = (label) => { responseSubmit.querySelector("[data-response-submit-label]").textContent = label; };
  const responseFeedback = container.querySelector(".ds-response-feedback");
  response.addEventListener("input", () => {
    responseCount.textContent = response.value.length;
    responseFeedback.textContent = "";
    responseFeedback.classList.remove("is-ready");
    responseFeedback.classList.remove("is-success");
    setResponseSubmitLabel("SUBMIT EXPLANATION");
    responseSubmit.disabled = false;
    response.setAttribute("aria-invalid", "false");
  }, { signal });
  response.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    responseForm.requestSubmit();
  }, { signal });
  responseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!response.value.trim()) {
      responseFeedback.textContent = "Add your explanation before submitting.";
      response.setAttribute("aria-invalid", "true");
      response.focus();
      return;
    }
    responseFeedback.textContent = "Submitted — clear thinking earns progress.";
    responseFeedback.classList.remove("is-ready");
    responseFeedback.classList.add("is-success");
    setResponseSubmitLabel("SUBMITTED ✓");
    responseSubmit.disabled = true;
    launchConfetti();
  }, { signal });

  mountReasoningQuestions(container, signal);
  mountMotionReference(container, signal);
  mountFieldContract(container, signal);
  // Showcase frames are useful in the reference gallery, but Focus Mode is
  // not part of the learner level. Render the practice lab directly instead.
  if (!practiceOnly) mountShowcaseFrames(container, signal);
  mountMarkdownFeatures(container, { signal, scrollSurface:container.querySelector(".ds-build-guide") });
  mountBuildSplitter(container, signal);
  mountBuildGuideOverflow(container, signal);
  mountCodeLabSplitter(container, signal);
  mountCodeQuestWhenVisible(container, signal, codeQuest, (dispose) => disposers.push(dispose), { onContinue });

  highlightCode(container, signal);

  return () => {
    controller.abort();
    disposers.splice(0).forEach((dispose) => dispose());
    container.classList.remove("ds-practice-only");
    document.body.classList.remove("ds-preview-open");
    document.querySelector(".ds-confetti")?.remove();
  };
}

function mountMotionReference(container, signal) {
  const reference = container.querySelector("[data-motion-reference]");
  if (!reference) return;
  const standard = reference.querySelector("[data-motion-standard]");
  const replay = reference.querySelector("[data-motion-replay]");
  const status = reference.querySelector("[data-motion-status]");
  let motion = null;
  replay.addEventListener("click", () => {
    motion?.cancel();
    motion = null;
    const reduced = prefersReducedMotion();
    if (!reduced) {
      motion = standard.animate(
        [{ transform:"scaleX(0)" }, { transform:"scaleX(1)" }],
        { duration:1050, easing:"cubic-bezier(.2,.8,.2,1)" },
      );
    }
    status.textContent = reduced
      ? "System preference respected: both examples retain 100% without movement."
      : "Comparison replayed: both examples retain the same 100% outcome.";
  }, { signal });
  signal.addEventListener("abort", () => motion?.cancel(), { once:true });
}

function mountFieldContract(container, signal) {
  const form = container.querySelector("[data-field-example]");
  if (!form) return;
  const input = form.querySelector("input");
  const feedback = form.querySelector("[data-field-feedback]");
  const setFeedback = (message, state = "") => {
    feedback.textContent = message;
    feedback.classList.toggle("is-error", state === "error");
    feedback.classList.toggle("is-success", state === "success");
  };
  input.addEventListener("input", () => {
    if (input.getAttribute("aria-invalid") !== "true") return;
    input.removeAttribute("aria-invalid");
    setFeedback("Changed. Validate again when ready.");
  }, { signal });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input.value.trim();
    let valid = false;
    try {
      const url = new URL(value);
      valid = url.protocol === "https:" && !value.endsWith("/");
    } catch {
      valid = false;
    }
    input.setAttribute("aria-invalid", String(!valid));
    setFeedback(
      valid ? "Success: URL format is ready." : "Error: enter an HTTPS URL without a trailing slash.",
      valid ? "success" : "error",
    );
    if (!valid) input.focus();
  }, { signal });
  form.addEventListener("reset", () => {
    input.removeAttribute("aria-invalid");
    setFeedback("");
  }, { signal });
}

function setPatternFeedback(feedback, message, state = "") {
  feedback.innerHTML = message;
  feedback.classList.toggle("is-success", state === "success");
  feedback.classList.toggle("is-error", state === "error");
}

function mountReasoningQuestions(container, signal) {
  const tracePanel = container.querySelector("[data-trace-question]");
  const traceForm = tracePanel.querySelector("[data-trace-form]");
  const traceInput = traceForm.querySelector("[name='trace']");
  const traceFeedback = tracePanel.querySelector(".ds-pattern-feedback");
  traceInput.addEventListener("input", () => {
    traceInput.setAttribute("aria-invalid", "false");
    setPatternFeedback(traceFeedback, "Commit to a trace before checking.");
  }, { signal });
  traceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const answer = traceInput.value.replace(/\s+/g, "");
    const isCorrect = answer === "2,5,20";
    traceInput.setAttribute("aria-invalid", String(!isCorrect));
    setPatternFeedback(
      traceFeedback,
      isCorrect
        ? "Correct — multiply by <code class='ds-inline-token'>2</code>, add <code class='ds-inline-token'>3</code>, then multiply by <code class='ds-inline-token'>4</code>."
        : "Not yet. Record <code class='ds-inline-token'>total</code> immediately after values <code class='ds-inline-token'>2</code>, <code class='ds-inline-token'>3</code>, and <code class='ds-inline-token'>4</code>.",
      isCorrect ? "success" : "error",
    );
    if (!isCorrect) traceInput.focus();
  }, { signal });

  const parsons = container.querySelector("[data-parsons-question]");
  const parsonsList = parsons.querySelector("[data-parsons-list]");
  const parsonsFeedback = parsons.querySelector("[data-parsons-feedback]");
  const animateParsonsBlocks = (previousRects) => {
    if (prefersReducedMotion()) return;
    [...parsonsList.children].forEach((block) => {
      const previous = previousRects.get(block);
      if (!previous) return;
      const current = block.getBoundingClientRect();
      const x = previous.left - current.left;
      const y = previous.top - current.top;
      if (x === 0 && y === 0) return;
      block.getAnimations().forEach((animation) => animation.cancel());
      block.animate(
        [{ transform:`translate(${x}px, ${y}px)` }, { transform:"translate(0, 0)" }],
        { duration:320, easing:"cubic-bezier(.2,.8,.2,1)" },
      );
    });
  };
  const updateParsons = () => {
    const blocks = [...parsonsList.children];
    blocks.forEach((block, index) => {
      block.querySelector(".ds-parsons-position").textContent = String(index + 1);
      block.querySelector("[data-move='up']").setAttribute("aria-disabled", String(index === 0));
      block.querySelector("[data-move='down']").setAttribute("aria-disabled", String(index === blocks.length - 1));
    });
  };
  parsonsList.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    const block = button?.closest("li");
    if (!button || !block) return;
    const direction = button.dataset.move;
    if (button.getAttribute("aria-disabled") === "true") return;
    const previousRects = new Map([...parsonsList.children].map((item) => [item, item.getBoundingClientRect()]));
    if (direction === "up" && block.previousElementSibling) block.previousElementSibling.before(block);
    if (direction === "down" && block.nextElementSibling) block.nextElementSibling.after(block);
    updateParsons();
    animateParsonsBlocks(previousRects);
    const position = [...parsonsList.children].indexOf(block) + 1;
    setPatternFeedback(parsonsFeedback, `Block moved to position <code class='ds-inline-token'>${position}</code>. Check the complete flow when ready.`);
  }, { signal });
  parsons.querySelector("[data-check-parsons]").addEventListener("click", () => {
    const blocks = [...parsonsList.children];
    const activeOrder = blocks.map((block) => block.dataset.blockId).join(",");
    const isCorrect = activeOrder === "request,guard,parse,return";
    setPatternFeedback(
      parsonsFeedback,
      isCorrect
        ? "Correct — request, verify, parse once, then return the name."
        : "Not yet. <code class='ds-inline-token'>response</code> must exist before its status or body is read, and <code class='ds-inline-token'>profile</code> must exist before its name is returned.",
      isCorrect ? "success" : "error",
    );
  }, { signal });
  updateParsons();

  const diagnosisPanel = container.querySelector("[data-diagnosis-question]");
  const diagnosisForm = diagnosisPanel.querySelector("[data-diagnosis-form]");
  const diagnosisFeedback = diagnosisPanel.querySelector("[data-diagnosis-feedback]");
  diagnosisForm.addEventListener("change", () => setPatternFeedback(diagnosisFeedback, "Selections changed. Make sure the repair follows from the cause."), { signal });
  diagnosisForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(diagnosisForm);
    const hasBoth = values.has("cause") && values.has("repair");
    const isCorrect = values.get("cause") === "shared" && values.get("repair") === "let";
    setPatternFeedback(
      diagnosisFeedback,
      isCorrect
        ? "Correct — <code class='ds-inline-token'>let</code> creates a fresh binding for each iteration, so each closure keeps its own value."
        : hasBoth
          ? "Those choices do not form a causal pair. Ask when each callback reads <code class='ds-inline-token'>i</code> and which binding it reads."
          : "Choose both an explanation and a repair before checking.",
      isCorrect ? "success" : "error",
    );
    if (!hasBoth) diagnosisForm.querySelector(`[name='${values.has("cause") ? "repair" : "cause"}']`)?.focus();
  }, { signal });

  const boundaryPanel = container.querySelector("[data-boundary-question]");
  const boundaryForm = boundaryPanel.querySelector("[data-boundary-form]");
  const boundaryInput = boundaryForm.querySelector("[name='total']");
  const boundaryExpected = boundaryForm.querySelector("[name='expected']");
  const boundaryFeedback = boundaryPanel.querySelector("[data-boundary-feedback]");
  boundaryForm.addEventListener("input", () => {
    boundaryInput.setAttribute("aria-invalid", "false");
    boundaryExpected.setAttribute("aria-invalid", "false");
    setPatternFeedback(boundaryFeedback, "Find the exact value where <code class='ds-inline-token'>&gt;</code> and “or more” disagree.");
  }, { signal });
  boundaryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const hasValues = boundaryInput.value !== "" && boundaryExpected.value !== "";
    const isCorrect = Number(boundaryInput.value) === 50 && boundaryExpected.value === "true";
    boundaryInput.setAttribute("aria-invalid", String(!hasValues || !isCorrect));
    boundaryExpected.setAttribute("aria-invalid", String(!hasValues || !isCorrect));
    setPatternFeedback(
      boundaryFeedback,
      isCorrect
        ? "Correct — <code class='ds-inline-token'>50</code> should return <code class='ds-inline-token'>true</code>, but the strict greater-than check returns <code class='ds-inline-token'>false</code>."
        : hasValues
          ? "That case does not expose this boundary. Find the one total accepted by “or more” but rejected by <code class='ds-inline-token'>&gt;</code>."
          : "Provide both the input and its expected result.",
      isCorrect ? "success" : "error",
    );
    if (!isCorrect) (boundaryInput.value === "" ? boundaryInput : boundaryExpected).focus();
  }, { signal });
}

function mountSectionCollapsers(container, signal) {
  const sections = new Map();

  container.querySelectorAll(".ds-section").forEach((section) => {
    const head = section.querySelector(":scope > .ds-section-head");
    if (!head) return;

    const body = document.createElement("div");
    body.className = "ds-section-body";
    body.id = `${section.id}-content`;
    body.hidden = true;
    section.classList.add("is-collapsed");
    while (head.nextElementSibling) body.append(head.nextElementSibling);
    section.append(body);

    const toggle = document.createElement("button");
    const sectionTitle = head.querySelector("h2")?.textContent || "section";
    toggle.className = "ds-section-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", body.id);
    toggle.setAttribute("aria-label", `Expand ${sectionTitle}`);
    toggle.innerHTML = '<span class="ds-section-toggle-label">Expand</span><b aria-hidden="true">+</b>';
    head.append(toggle);

    let motion = null;
    let motionVersion = 0;
    const setExpanded = (expanded, { animate = true } = {}) => {
      motionVersion += 1;
      const version = motionVersion;
      motion?.cancel();
      motion = null;
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.setAttribute("aria-label", `${expanded ? "Collapse" : "Expand"} ${sectionTitle}`);
      section.classList.toggle("is-collapsed", !expanded);
      toggle.querySelector(".ds-section-toggle-label").textContent = expanded ? "Collapse" : "Expand";
      toggle.querySelector("b").textContent = expanded ? "−" : "+";

      const reducedMotion = prefersReducedMotion();
      if (!animate || reducedMotion) {
        body.hidden = !expanded;
        return;
      }

      body.hidden = false;
      motion = body.animate(
        expanded
          ? [{ opacity:0, transform:"translateY(-6px)" }, { opacity:1, transform:"translateY(0)" }]
          : [{ opacity:1, transform:"translateY(0)" }, { opacity:0, transform:"translateY(-4px)" }],
        { duration:expanded ? 180 : 130, easing:expanded ? "cubic-bezier(.2,.8,.2,1)" : "ease-in" },
      );
      motion.finished.then(() => {
        if (version !== motionVersion) return;
        body.hidden = !expanded;
        motion = null;
      }).catch((error) => {
        if (error.name !== "AbortError") console.error("Section motion did not finish.", error);
      });
    };

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      setExpanded(!expanded);
    }, { signal });
    signal.addEventListener("abort", () => motion?.cancel(), { once:true });
    sections.set(section.id, { section, setExpanded });
  });

  const jumpLinks = [...container.querySelectorAll('.ds-jump a[href^="#"]')];
  const markCurrentSection = (sectionId) => {
    jumpLinks.forEach((link) => {
      if (link.getAttribute("href") === `#${sectionId}`) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };
  const findHashTarget = () => {
    if (!window.location.hash) return null;
    try {
      const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      return target && container.contains(target) ? target : null;
    } catch {
      return null;
    }
  };
  const revealTarget = (target, { scroll = false } = {}) => {
    const section = target?.closest(".ds-section");
    const entry = section ? sections.get(section.id) : null;
    if (!entry) return false;
    entry.setExpanded(true, { animate:false });
    markCurrentSection(section.id);
    if (scroll) {
      window.requestAnimationFrame(() => target.scrollIntoView({ block:"start", behavior:"auto" }));
    }
    return true;
  };
  const revealHashTarget = ({ scroll = false } = {}) => revealTarget(findHashTarget(), { scroll });
  const revealCurrentLocation = ({ scroll = false } = {}) => {
    if (revealHashTarget({ scroll })) return;
    revealTarget(document.getElementById("foundations"), { scroll });
  };

  jumpLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const target = document.getElementById(link.getAttribute("href").slice(1));
      revealTarget(target);
    }, { signal });
  });
  window.addEventListener("hashchange", () => revealCurrentLocation({ scroll:true }), { signal });
  if (container.classList.contains("ds-practice-only")) revealTarget(document.getElementById("interactive"));
  else revealCurrentLocation({ scroll:Boolean(window.location.hash) });
}

function mountShowcaseFrames(container, signal) {
  const panels = container.querySelectorAll("#components .ds-grid > .ds-panel, #questions .ds-section-body > .ds-panel, #explanations .ds-section-body > .ds-panel, #interactive .ds-section-body > .ds-panel");
  let expandedFrame = null;

  const closePreview = ({ restoreFocus = true } = {}) => {
    if (!expandedFrame) return;
    const button = expandedFrame.querySelector(".ds-showcase-expand");
    const isBuild = expandedFrame.classList.contains("ds-showcase-frame--build");
    expandedFrame.classList.remove("is-expanded");
    expandedFrame.removeAttribute("role");
    expandedFrame.removeAttribute("aria-modal");
    expandedFrame.removeAttribute("aria-label");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = isBuild ? "<span>FOCUS MODE</span><b>↗</b>" : "<span>EXPAND</span><b>↗</b>";
    document.body.classList.remove("ds-preview-open");
    expandedFrame = null;
    if (restoreFocus) button.focus({ preventScroll:true });
  };

  panels.forEach((panel) => {
    const frame = document.createElement("div");
    frame.className = "ds-showcase-frame";
    const isMcq = panel.matches(".ds-question--mcq");
    const isResponse = panel.matches(".ds-response-panel");
    const isBuild = panel.matches(".ds-build-panel");
    const isDocumentation = panel.matches(".ds-doc-layout");
    const isSystemFeedback = panel.matches(".ds-state-patterns");
    const previewLabel = isBuild ? "PRACTICE LAB" : isDocumentation ? "LESSON CONTENT PREVIEW" : isSystemFeedback ? "SYSTEM FEEDBACK PREVIEW" : "COMPONENT PREVIEW";
    frame.classList.toggle("ds-showcase-frame--mcq", isMcq);
    frame.classList.toggle("ds-showcase-frame--response", isResponse);
    frame.classList.toggle("ds-showcase-frame--build", isBuild);
    frame.classList.toggle("ds-showcase-frame--documentation", isDocumentation);
    frame.classList.toggle("ds-showcase-frame--states", isSystemFeedback);
    frame.innerHTML = `<div class="ds-showcase-toolbar"><span>${previewLabel}</span><div class="ds-showcase-actions"><button class="ds-showcase-expand" type="button" aria-expanded="false"><span>${isBuild ? "FOCUS MODE" : "EXPAND"}</span><b>↗</b></button></div></div>`;
    panel.before(frame);
    frame.append(panel);

    frame.querySelector(".ds-showcase-expand").addEventListener("click", () => {
      if (expandedFrame === frame) {
        closePreview();
        return;
      }
      closePreview();
      expandedFrame = frame;
      frame.classList.add("is-expanded");
      const button = frame.querySelector(".ds-showcase-expand");
      const title = panel.querySelector("h3")?.textContent || "Lesson preview";
      frame.setAttribute("role", "dialog");
      frame.setAttribute("aria-modal", "true");
      frame.setAttribute("aria-label", title);
      button.setAttribute("aria-expanded", "true");
      button.innerHTML = isBuild ? "<b>←</b><span>EXIT FOCUS</span>" : "<b>←</b><span>LEAVE LESSON</span>";
      document.body.classList.add("ds-preview-open");
      frame.scrollTop = 0;
      button.focus({ preventScroll:true });
    }, { signal });

    panel.querySelectorAll("[data-question-back]").forEach((button) => {
      button.addEventListener("click", () => {
        if (expandedFrame === frame) closePreview();
      }, { signal });
    });
  });

  document.addEventListener("keydown", (event) => {
    if (!expandedFrame) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closePreview();
      return;
    }
    trapTabKey(event, expandedFrame);
  }, { signal });
  signal.addEventListener("abort", () => closePreview({ restoreFocus:false }), { once:true });
}

function mountBuildGuideOverflow(container, signal) {
  const guide = container.querySelector(".ds-build-guide");
  const button = container.querySelector("[data-guide-scroll]");
  if (!guide || !button) return;
  const update = () => {
    const hasOverflow = guide.scrollHeight > guide.clientHeight + 2;
    const hasMore = hasOverflow && guide.scrollTop + guide.clientHeight < guide.scrollHeight - 2;
    guide.classList.toggle("has-more-content", hasMore);
  };
  button.addEventListener("click", () => {
    guide.scrollBy({ top:Math.max(140, guide.clientHeight * .58), behavior:"smooth" });
  }, { signal });
  guide.addEventListener("scroll", update, { signal, passive:true });
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(update);
    observer.observe(guide);
    const content = guide.querySelector(".markdown-rendered");
    if (content) observer.observe(content);
    signal.addEventListener("abort", () => observer.disconnect(), { once:true });
  } else {
    window.addEventListener("resize", update, { passive:true, signal });
  }
  window.requestAnimationFrame(update);
}

function mountBuildSplitter(container, signal) {
  const content = container.querySelector("[data-build-content]");
  const resizer = container.querySelector("[data-build-resizer]");
  if (!content || !resizer) return;
  const getBounds = () => {
    const rect = content.getBoundingClientRect();
    const narrow = window.matchMedia("(max-width: 980px)").matches;
    const min = narrow ? 300 : 360;
    const max = Math.max(min, rect.width - (narrow ? 360 : 520));
    return { min, max };
  };
  const clampWidth = (value) => {
    const { min, max } = getBounds();
    return Math.min(Math.max(value, min), max);
  };
  const updateSeparatorMetadata = () => {
    const current = content.querySelector(".ds-build-guide").getBoundingClientRect().width;
    if (current <= 0) return;
    const { min, max } = getBounds();
    resizer.setAttribute("aria-valuemin", String(Math.round(min)));
    resizer.setAttribute("aria-valuemax", String(Math.round(max)));
    resizer.setAttribute("aria-valuenow", String(Math.round(clampWidth(current))));
  };
  const setGuideWidth = (value) => {
    const width = clampWidth(value);
    content.style.setProperty("--ds-build-guide-width", `${Math.round(width)}px`);
    updateSeparatorMetadata();
  };
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(updateSeparatorMetadata);
    observer.observe(content);
    signal.addEventListener("abort", () => observer.disconnect(), { once:true });
  } else {
    window.addEventListener("resize", updateSeparatorMetadata, { passive:true, signal });
  }
  updateSeparatorMetadata();
  resizer.addEventListener("pointerdown", (event) => {
    if (window.matchMedia("(max-width: 760px)").matches) return;
    event.preventDefault();
    resizer.setPointerCapture(event.pointerId);
    content.classList.add("is-resizing");
    const move = (moveEvent) => setGuideWidth(moveEvent.clientX - content.getBoundingClientRect().left);
    const stop = () => {
      content.classList.remove("is-resizing");
      resizer.removeEventListener("pointermove", move);
      resizer.removeEventListener("pointerup", stop);
      resizer.removeEventListener("pointercancel", stop);
    };
    resizer.addEventListener("pointermove", move, { signal });
    resizer.addEventListener("pointerup", stop, { once:true, signal });
    resizer.addEventListener("pointercancel", stop, { once:true, signal });
    move(event);
  }, { signal });
  signal.addEventListener("abort", () => content.classList.remove("is-resizing"), { once:true });
  resizer.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = content.querySelector(".ds-build-guide").getBoundingClientRect().width;
    if (event.key === "Home") setGuideWidth(360);
    else if (event.key === "End") setGuideWidth(content.getBoundingClientRect().width - 520);
    else setGuideWidth(current + (event.key === "ArrowRight" ? 24 : -24));
  }, { signal });
}

function mountCodeLabSplitter(container, signal) {
  const lab = container.querySelector("[data-code-lab]");
  const resizer = container.querySelector("[data-lab-resizer]");
  if (!lab || !resizer) return;
  const getBounds = () => {
    const rect = lab.getBoundingClientRect();
    const min = 280;
    const max = Math.max(min, rect.width - 280);
    return { min, max };
  };
  const clampWidth = (value) => {
    const { min, max } = getBounds();
    return Math.min(Math.max(value, min), max);
  };
  const updateSeparatorMetadata = () => {
    const current = lab.querySelector(".ds-editor-card").getBoundingClientRect().width;
    if (current <= 0) return;
    const { min, max } = getBounds();
    resizer.setAttribute("aria-valuemin", String(Math.round(min)));
    resizer.setAttribute("aria-valuemax", String(Math.round(max)));
    resizer.setAttribute("aria-valuenow", String(Math.round(clampWidth(current))));
  };
  const setEditorWidth = (value) => {
    const width = clampWidth(value);
    lab.style.setProperty("--ds-code-editor-width", `${Math.round(width)}px`);
    updateSeparatorMetadata();
  };
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(updateSeparatorMetadata);
    observer.observe(lab);
    signal.addEventListener("abort", () => observer.disconnect(), { once:true });
  } else {
    window.addEventListener("resize", updateSeparatorMetadata, { passive:true, signal });
  }
  updateSeparatorMetadata();
  resizer.addEventListener("pointerdown", (event) => {
    if (window.matchMedia("(max-width: 980px)").matches) return;
    event.preventDefault();
    resizer.setPointerCapture(event.pointerId);
    lab.classList.add("is-resizing");
    const move = (moveEvent) => setEditorWidth(moveEvent.clientX - lab.getBoundingClientRect().left);
    const stop = () => {
      lab.classList.remove("is-resizing");
      resizer.removeEventListener("pointermove", move);
      resizer.removeEventListener("pointerup", stop);
      resizer.removeEventListener("pointercancel", stop);
    };
    resizer.addEventListener("pointermove", move, { signal });
    resizer.addEventListener("pointerup", stop, { once:true, signal });
    resizer.addEventListener("pointercancel", stop, { once:true, signal });
    move(event);
  }, { signal });
  signal.addEventListener("abort", () => lab.classList.remove("is-resizing"), { once:true });
  resizer.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = lab.querySelector(".ds-editor-card").getBoundingClientRect().width;
    if (event.key === "Home") setEditorWidth(280);
    else if (event.key === "End") setEditorWidth(lab.getBoundingClientRect().width - 280);
    else setEditorWidth(current + (event.key === "ArrowRight" ? 24 : -24));
  }, { signal });
}

async function mountCodeQuest(container, signal, codeQuest, { onContinue = null } = {}) {
  const lab = container.querySelector("[data-code-lab]");
  if (!lab) return () => {};
  const { html:htmlCode = "", css:cssCode = "", js:jsCode = "" } = codeQuest.files || {};
  const values = { html:htmlCode, css:cssCode, js:jsCode };
  const preview = lab.querySelector(".ds-live-preview");
  const consoleOutput = lab.querySelector("[data-console-output]");
  const consoleCount = lab.querySelector("[data-console-count]");
  const outputTabs = [...lab.querySelectorAll("[data-output-tab]")];
  let activeRunId = 0;
  let consoleLineCount = 0;
  const updateConsoleCount = () => {
    consoleCount.textContent = String(consoleLineCount);
    consoleCount.hidden = consoleLineCount === 0;
  };
  const clearConsole = () => {
    consoleLineCount = 0;
    consoleOutput.innerHTML = `<p class="ds-console-empty">Console output will appear here.</p>`;
    updateConsoleCount();
  };
  const appendConsoleLine = (level, args) => {
    consoleOutput.querySelector(".ds-console-empty")?.remove();
    const line = document.createElement("div");
    line.className = `ds-console-line ds-console-line--${["log", "info", "warn", "error"].includes(level) ? level : "log"}`;
    const badge = document.createElement("span");
    badge.textContent = level === "log" ? ">" : level;
    const message = document.createElement("pre");
    message.textContent = args.join(" ");
    line.append(badge, message);
    consoleOutput.append(line);
    consoleLineCount += 1;
    updateConsoleCount();
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  };
  const selectOutput = (name, { focus = false } = {}) => {
    outputTabs.forEach((tab) => {
      const selected = tab.dataset.outputTab === name;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.setAttribute("tabindex", selected ? "0" : "-1");
      if (selected && focus) tab.focus();
    });
    lab.querySelectorAll("[data-output-panel]").forEach((panel) => { panel.hidden = panel.dataset.outputPanel !== name; });
  };
  outputTabs.forEach((tab) => tab.addEventListener("click", () => selectOutput(tab.dataset.outputTab), { signal }));
  lab.querySelector("[data-clear-console]")?.addEventListener("click", clearConsole, { signal });
  lab.querySelector(".ds-output-tabs")?.addEventListener("keydown", (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = outputTabs.indexOf(event.target.closest("[data-output-tab]"));
    if (currentIndex < 0) return;
    let nextIndex = event.key === "Home" ? 0 : outputTabs.length - 1;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + outputTabs.length) % outputTabs.length;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % outputTabs.length;
    selectOutput(outputTabs[nextIndex].dataset.outputTab, { focus:true });
  }, { signal });
  window.addEventListener("message", (event) => {
    if (event.source !== preview.contentWindow || event.data?.source !== PREVIEW_MESSAGE_SOURCE || event.data.runId !== activeRunId) return;
    if (event.data.type === "clear") clearConsole();
    if (event.data.type === "console") appendConsoleLine(event.data.level, Array.isArray(event.data.args) ? event.data.args : []);
  }, { signal });
  const updatePreview = () => {
    activeRunId += 1;
    clearConsole();
    preview.srcdoc = createCodePreviewDocument({ ...values, previewStyles:codeQuest.previewStyles, runId:activeRunId });
  };
  updatePreview();
  let previewFrame = 0;
  let passed = false;
  let runButton = null;
  const setRunState = (nextPassed) => {
    passed = nextPassed;
    if (!runButton) return;
    runButton.dataset.codeState = passed ? "passed" : "checking";
    const label = runButton.querySelector("[data-template-action-label], span");
    if (label) label.textContent = passed ? "CONTINUE" : "RUN CHECK";
  };
  const schedulePreview = () => {
    window.cancelAnimationFrame(previewFrame);
    previewFrame = window.requestAnimationFrame(updatePreview);
  };
  let disposeEditor = () => {};
  try {
    const { mountLessonCodeLab } = await import("../../assets/vendor/lesson-code-editor.js");
    if (signal.aborted) return disposeEditor;
    const mountedEditor = mountLessonCodeLab(lab, { htmlCode, cssCode, jsCode, onChange(type, value) { values[type] = value; setRunState(false); schedulePreview(); } });
    disposeEditor = typeof mountedEditor === "function" ? mountedEditor : disposeEditor;
    const tablist = lab.querySelector("[role='tablist']");
    tablist.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const tabs = [...tablist.querySelectorAll("[role='tab']")];
      const currentIndex = tabs.indexOf(event.target.closest("[role='tab']"));
      if (currentIndex < 0) return;
      event.preventDefault();
      let nextIndex = event.key === "Home" ? 0 : tabs.length - 1;
      if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
      tabs[nextIndex].click();
      tabs[nextIndex].focus();
    }, { signal });
  } catch (error) {
    if (signal.aborted) return disposeEditor;
    console.error("The lesson code editor failed to load.", error);
    lab.querySelector(".ds-editor-card").innerHTML = `<p class="ds-editor-error">The editor could not load. Refresh and try again.</p>`;
  }
  if (signal.aborted) return disposeEditor;
  runButton = container.querySelector("[data-run-code]");
  if (!runButton) return disposeEditor;
  runButton.addEventListener("click", () => {
    if (passed) {
      if (typeof onContinue === "function") onContinue();
      return;
    }
    const results = codeQuest.checks.map((check) => evaluateCodeCheck(check, values));
    const passes = results.every(Boolean);
    const checklist = container.querySelectorAll(".ds-build-guide input[type='checkbox']");
    checklist.forEach((item, index) => { item.checked = Boolean(results[index]); });
    if (passes) {
      setRunState(true);
      launchConfetti();
    }
  }, { signal });
  return () => {
    window.cancelAnimationFrame(previewFrame);
    disposeEditor();
  };
}

function mountCodeQuestWhenVisible(container, signal, codeQuest, registerDispose, options = {}) {
  // UI Lab no longer uses the design-system disclosure wrapper. Its editor is
  // immediately visible inside the ready-to-ship Content Area shell, so mount
  // it directly instead of waiting for a collapse toggle that is not present.
  if (container.classList.contains("ds-practice-only")) {
    void mountCodeQuest(container, signal, codeQuest, options).then((dispose) => {
      if (signal.aborted) dispose();
      else registerDispose(dispose);
    }).catch((error) => console.error("The code quest could not be initialized.", error));
    return;
  }
  const content = container.querySelector("#interactive-content");
  const toggle = container.querySelector("#interactive .ds-section-toggle");
  if (!content || !toggle) return;
  let started = false;
  const start = () => {
    if (started || content.hidden || signal.aborted) return;
    started = true;
    void mountCodeQuest(container, signal, codeQuest, options).then((dispose) => {
      if (signal.aborted) dispose();
      else registerDispose(dispose);
    }).catch((error) => console.error("The code quest could not be initialized.", error));
  };
  start();
  toggle.addEventListener("click", start, { signal });
}

function launchConfetti() {
  launchCelebration({ className:"ds-confetti", replaceExisting:true });
}
