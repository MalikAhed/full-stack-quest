import { escapeHtml } from "../lib/dom.js";

const ATTRIBUTE_NAME = /^[A-Za-z_:][A-Za-z0-9:._-]*$/;

function renderAttributes(attributes = {}) {
  return Object.entries(attributes).map(([name, value]) => {
    if (!ATTRIBUTE_NAME.test(name)) throw new TypeError(`Invalid HTML attribute name: ${name}`);
    if (value === false || value == null) return "";
    if (value === true) return ` ${name}`;
    return ` ${name}="${escapeHtml(value)}"`;
  }).join("");
}

export function renderTemplateFooter({
  className = "level-layout-actions",
  backLabel = "BACK", backAttributes = {},
  feedback = "", feedbackClass = "level-feedback", feedbackAttributes = {},
  primaryLabel = "CONTINUE", primaryAttributes = {}, primaryLabelAttributes = {}, primaryTrailingContent = "", showShortcut = true,
} = {}) {
  return `<nav class="${escapeHtml(className)}" aria-label="Lesson navigation">
    <p class="${escapeHtml(feedbackClass)}"${renderAttributes(feedbackAttributes)}>${escapeHtml(feedback)}</p>
    <div class="level-layout-action-group">
      <button class="level-action" type="button" data-template-back${renderAttributes(backAttributes)}>${escapeHtml(backLabel)}</button>
      <button class="level-action level-action--primary level-action--check" type="button" data-template-primary${renderAttributes(primaryAttributes)}><span data-template-action-label${renderAttributes(primaryLabelAttributes)}>${escapeHtml(primaryLabel)}</span>${primaryTrailingContent}${showShortcut ? '<kbd aria-label="Enter key"><b>↵</b> ENTER</kbd>' : ""}</button>
    </div>
  </nav>`;
}

export function renderTemplateShell({ content, footer, showScrollIndicator = true, titleId = "ui-lab-content-title" }) {
  return `<div class="level-layout-preview">
    <div class="level-layout-content">
      <section class="level-layout-task" aria-labelledby="${escapeHtml(titleId)}">${content}</section>
      ${showScrollIndicator ? '<button class="ui-lab-content-scroll" type="button" data-content-scroll aria-label="Show more content"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 9.5 5.5 5 5.5-5"/></svg></button>' : ""}
    </div>
    ${footer}
  </div>`;
}
