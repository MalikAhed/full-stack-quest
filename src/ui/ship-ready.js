import { SHIP_READY_TEMPLATES } from "../data/ship-ready.js";
import { escapeHtml } from "../lib/dom.js";
import { renderLessonInline } from "../markdown/renderer.js";

const PREVIEW_RENDERERS = {
  image:({ src }, route) => `<div class="ship-ready-preview" aria-hidden="true"><img src="${escapeHtml(src)}" alt="" data-preview-route="${escapeHtml(route)}" /></div>`,
  sequence:(_, route) => `<div class="ship-ready-preview ship-ready-order-preview" aria-hidden="true" data-preview-route="${route}"><div class="ship-ready-order-progress"><i></i></div><strong>PUT THE FLOW IN ORDER</strong><div class="ship-ready-order-slots"><span>1&nbsp;&nbsp; Click a link</span><span>2&nbsp;&nbsp; Send a request</span></div><div class="ship-ready-order-bank"><i></i><i></i><i></i></div></div>`,
  "fill-blanks":(_, route) => `<div class="ship-ready-preview ship-ready-fill-preview" aria-hidden="true" data-preview-route="${route}"><div class="ship-ready-fill-progress"><i></i></div><strong>COMPLETE THE REQUEST</strong><div class="ship-ready-fill-code"><span>fetch(</span><i></i><span>, { method:</span><i></i><span>})</span></div><div class="ship-ready-fill-options">${['`"POST"`', '`"/api/users"`', '`"GET"`'].map(renderLessonInline).join("")}</div></div>`,
  "spot-bug":(_, route) => `<div class="ship-ready-preview ship-ready-bug-preview" aria-hidden="true" data-preview-route="${route}"><strong>WHICH LINE BREAKS?</strong>${[1, 2, 3, 4].map((line) => `<div${line === 3 ? ' class="is-selected"' : ""}><span>${line}</span><i></i></div>`).join("")}</div>`,
  code:(_, route) => `<div class="ship-ready-preview ship-ready-code-preview" aria-hidden="true" data-preview-route="${route}"><div class="ship-ready-code-copy"><strong>YOUR MISSION</strong><span></span><span></span><i></i><i></i></div><div class="ship-ready-code-editor"><header><b></b><b></b></header><span></span><span></span><span></span><span></span></div><div class="ship-ready-code-result"><b></b><span></span><span></span></div></div>`,
};

function renderTemplateCard(template) {
  return `<article class="ship-ready-card">
    ${PREVIEW_RENDERERS[template.preview.type](template.preview, template.route)}
    <div class="ship-ready-card-copy"><div><p>${escapeHtml(template.label)}</p><h3>${escapeHtml(template.title)}</h3></div><button type="button" data-open-template="${escapeHtml(template.route)}">OPEN TEMPLATE</button></div>
  </article>`;
}

export function renderShipReadyLibrary(panel, { onOpenTemplate }) {
  panel.innerHTML = `<section class="ship-ready-library" aria-labelledby="ship-ready-title">
    <header class="ship-ready-header"><p>READY TO USE</p><h2 id="ship-ready-title">Lesson Templates</h2><span>Reusable layouts approved for lessons.</span></header>
    <div class="ship-ready-grid">${SHIP_READY_TEMPLATES.map(renderTemplateCard).join("")}</div>
  </section>`;

  panel.querySelectorAll("[data-open-template]").forEach((button) => {
    button.addEventListener("click", () => onOpenTemplate(button, button.dataset.openTemplate));
  });
}
