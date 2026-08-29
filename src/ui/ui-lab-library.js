export function renderUiLabLibrary(panel, { onOpenMarkdown }) {
  panel.innerHTML = `<section class="ship-ready-library ui-lab-library" aria-labelledby="ui-lab-library-title">
    <header class="ship-ready-header"><p>AUTHORING WORKBENCH</p><h2 id="ui-lab-library-title">Lesson Content System</h2><span>Develop and test content syntax against the real reusable lesson shell.</span></header>
    <div class="ship-ready-grid">
      <article class="ship-ready-card ui-lab-authoring-card">
        <div class="ship-ready-preview" aria-hidden="true"><img src="assets/template-previews/markdown-lab-desktop.webp" alt="" /></div>
        <div class="ship-ready-card-copy"><div><p>MARKDOWN + INTERACTIVE STEPS</p><h3>Lesson Authoring Lab</h3><span>Regular Markdown, directives, validation, and live shell preview.</span></div><button type="button" data-open-markdown-system>OPEN UI LAB</button></div>
      </article>
    </div>
  </section>`;
  panel.querySelector("[data-open-markdown-system]").addEventListener("click", (event) => onOpenMarkdown(event.currentTarget));
}
