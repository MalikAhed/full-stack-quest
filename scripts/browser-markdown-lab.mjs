export async function verifyMarkdownLab({ assert, captureScreenshot, cdp, delay, evaluate, sessionId, waitFor }) {
  await waitFor("Boolean(document.querySelector('[data-markdown-input]'))", "the Markdown editor");
  const testMarkdown = [
    "# Pasted document",
    "",
    "**Bold**, *emphasis*, ~~finished~~, and `inline code`.",
    "An [[term: API | A contract that lets software systems exchange data and actions.]] keeps the explanation in context.",
    "",
    "> A useful quote.",
    "",
    "- [x] Render the task",
    "- [ ] Review the result",
    "",
    "| Feature | State |",
    "| :-- | --: |",
    "| Table | Ready |",
    "",
    ":::tip Shared lesson feature",
    "This callout uses the **same renderer** as lesson content.",
    ":::",
    "",
    ":::warning Important limitation",
    "This warning uses the supported warning callout.",
    ":::",
    "",
    ":::reveal Show the answer",
    "The hidden answer is [[term: HTTP]].",
    ":::",
    "",
    "```js title=\"example.js\" highlight=1",
    "const rendered = true;",
    "```",
    "",
    "```",
    "def greet(name):",
    "    return f\"Hello, {name}\"",
    "```",
    "",
    "https://youtu.be/AlkDbnbv7dk?t=1m30s",
    "",
    "Keep this [YouTube link](https://www.youtube.com/watch?v=AlkDbnbv7dk) inline.",
    "",
    "<img src=\"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==\" onerror=\"window.__markdownXss = 1\">",
    "<script>window.__markdownXss = 2</script>",
    "[unsafe](javascript:window.__markdownXss=3)",
  ].join("\n");
  await evaluate(`(() => {
    window.__markdownXss = 0;
    const input = document.querySelector('[data-markdown-input]');
    input.value = ${JSON.stringify(testMarkdown)};
    input.dispatchEvent(new Event('input', { bubbles:true }));
  })()`);
  await waitFor("document.querySelector('[data-markdown-output] h1')?.textContent === 'Pasted document'", "pasted Markdown rendering");
  const rendered = await evaluate(`(() => {
    const output = document.querySelector('[data-markdown-output]');
    const unsafeLink = [...output.querySelectorAll('a')].find((link) => link.textContent === 'unsafe');
    return {
      heading:Boolean(output.querySelector('h1')),
      inlineFormatting:Boolean(output.querySelector('strong') && output.querySelector('em') && output.querySelector('del') && output.querySelector('p code')),
      quote:Boolean(output.querySelector('blockquote')),
      tasks:output.querySelectorAll('li > input[type="checkbox"][disabled]').length === 2,
      table:Boolean(output.querySelector('.markdown-table-scroll > table')),
      lessonCallout:output.querySelector('.markdown-callout')?.textContent.includes('same renderer') === true,
      warningCallout:output.querySelector('.markdown-callout--warning')?.textContent.includes('supported warning') === true,
      lessonReveal:output.querySelector('.markdown-reveal summary')?.textContent === 'Show the answer',
      fencedCode:Boolean(output.querySelector('pre code.language-js')),
      codeTitle:output.querySelector('.markdown-code-head span')?.textContent === 'example.js',
      highlightedLine:Boolean(output.querySelector('.markdown-code-line.is-highlighted')),
      coloredCode:Boolean(output.querySelector('pre code .hljs-keyword') && output.querySelector('pre code .hljs-literal')),
      autoDetectedCode:output.querySelectorAll('.markdown-code-block').length === 2
        && output.querySelectorAll('.markdown-code-head b')[1]?.textContent !== 'AUTO-DETECTED'
        && Boolean(output.querySelectorAll('pre code')[1]?.querySelector('.hljs-keyword')),
      technicalTerm:output.querySelector('.markdown-tech-label')?.textContent.includes('API') === true,
      termDefinition:output.querySelector('.markdown-tech-card')?.textContent.includes('exchange data and actions') === true,
      termKeyboardAccess:output.querySelector('.markdown-tech-term')?.tabIndex === 0,
      termAccessibleDescription:output.querySelector('.markdown-tech-term')?.getAttribute('aria-describedby')?.startsWith('markdown-term-') === true,
      youtubePlayer:output.querySelector('.markdown-youtube')?.children.length === 1
        && output.querySelector('.markdown-youtube-player')?.src === 'https://www.youtube-nocookie.com/embed/AlkDbnbv7dk?rel=0&start=90'
        && output.querySelector('.markdown-youtube-player')?.loading === 'lazy'
        && output.querySelector('.markdown-youtube-player')?.allowFullscreen === true,
      youtubeHasNoCard:!output.querySelector('.markdown-youtube header,.markdown-youtube p,.markdown-youtube strong'),
      inlineYoutubeStaysLink:[...output.querySelectorAll('a')].some((link) => link.textContent === 'YouTube link'),
      scriptRemoved:!output.querySelector('script'),
      eventHandlerRemoved:!output.querySelector('[onerror]'),
      unsafeProtocolRemoved:!unsafeLink || !unsafeLink.hasAttribute('href'),
      noExecution:window.__markdownXss === 0,
    };
  })()`);
  assert(Object.values(rendered).every(Boolean), `Markdown feature or sanitization coverage failed: ${JSON.stringify(rendered)}`);
  const sharedLessonRenderer = await evaluate(`import('/src/ui/lesson-content.js').then(({ renderLessonContent }) => {
    const host = document.createElement('div');
    host.innerHTML = renderLessonContent({
      body:'A lesson can explain [[term: API]].',
      blocks:[{ type:'markdown', source:':::tip Unified lesson Markdown\\nThe custom block is **safe and shared**.\\n:::' }],
    });
    return Boolean(host.querySelector('.markdown-tech-term') && host.querySelector('.markdown-callout'));
  })`);
  assert(sharedLessonRenderer, "validated lesson content must use the shared custom Markdown renderer");
  await evaluate("document.querySelector('.markdown-tech-term').focus()");
  await waitFor("Number.parseFloat(getComputedStyle(document.querySelector('.markdown-tech-card')).opacity) === 1", "the focused technical-term explanation card");

  await cdp.send("Emulation.setDeviceMetricsOverride", { width:1280, height:900, deviceScaleFactor:1, mobile:false }, sessionId);
  await delay(120);
  const desktop = await evaluate(`(() => {
    const editor = document.querySelector('.markdown-lab-editor').getBoundingClientRect();
    const preview = document.querySelector('.markdown-lab-preview').getBoundingClientRect();
    const shell = document.querySelector('.markdown-lab').getBoundingClientRect();
    return {
      sideBySide:editor.right < preview.left,
      previewGetsMoreSpace:preview.width >= editor.width * 1.6,
      fullCanvas:shell.left === 0 && Math.abs(shell.right - innerWidth) <= 1,
      contained:editor.top >= shell.top && preview.bottom <= shell.bottom + 1,
      noPageScroll:document.scrollingElement.scrollHeight <= innerHeight,
      noHorizontalOverflow:document.documentElement.scrollWidth <= innerWidth,
    };
  })()`);
  assert(Object.values(desktop).every(Boolean), `desktop Markdown Lab layout failed: ${JSON.stringify(desktop)}`);
  assert(await evaluate(`(() => {
    const top = document.querySelector('.lesson-top-title');
    return document.querySelector('[data-markdown-settings-layer]').hidden
      && !top.hasAttribute('role')
      && top.textContent === 'MARKDOWN LAB'
      && getComputedStyle(top).backgroundColor === 'rgba(0, 0, 0, 0)';
  })()`), "UI Lab chrome must stay neutral and keep settings closed by default");
  await captureScreenshot("markdown-lab-desktop.png");
  await evaluate("document.querySelector('[data-markdown-settings]').click()");
  await waitFor("!document.querySelector('[data-markdown-settings-layer]').hidden", "the Markdown settings panel");
  await evaluate("document.querySelector('[data-markdown-sample]').click()");
  await waitFor("document.querySelector('.markdown-rendered-progress')?.getAttribute('aria-valuenow') === '1' && document.querySelector('.markdown-rendered-progress')?.getAttribute('aria-valuemax') === '7'", "lesson progress inside the Rendered window on the first authored step");
  await evaluate("document.querySelector('[data-authored-step] [data-template-primary]').click()");
  await waitFor("document.querySelectorAll('[data-ui-lab-answer]').length === 4 && document.querySelector('.markdown-rendered-progress')?.getAttribute('aria-valuenow') === '2'", "the declarative MCQ rendered through the shared lesson component");
  assert(await evaluate(`(() => {
    const output = document.querySelector('[data-markdown-output]');
    return output.querySelector('.level-layout-preview')
      && output.querySelector('.lesson-question')
      && !output.querySelector('.markdown-lesson-progress')
      && getComputedStyle(document.querySelector('.markdown-rendered-progress')).borderRadius === '999px'
      && !document.querySelector('.lesson-top-title').hasAttribute('role')
      && !output.querySelector('style, script, [style*="display:grid"]');
  })()`), "the Rendered window must own lesson progress and select shared components without authored layout markup");
  await evaluate("document.querySelector('[data-full-preview]').click()");
  await waitFor("document.body.classList.contains('markdown-full-preview-open')", "the full-page lesson preview");
  assert(await evaluate(`(() => {
    const renderedShell = document.querySelector('.markdown-rendered-shell');
    const card = document.querySelector('.lesson-card');
    const shellStyle = getComputedStyle(renderedShell);
    return getComputedStyle(document.querySelector('.markdown-lab-editor')).display === 'none'
      && getComputedStyle(document.querySelector('.lesson-top')).display === 'none'
      && shellStyle.borderTopWidth === '0px'
      && shellStyle.borderRadius === '0px'
      && renderedShell.getBoundingClientRect().width === card.getBoundingClientRect().width
      && document.querySelector('.markdown-rendered-progress').getAttribute('role') === 'progressbar';
  })()`), "full-page preview must use the Content Area shell without a nested preview card");
  await captureScreenshot("markdown-lab-full-page.png");
  await evaluate("document.querySelector('[data-rendered-fullscreen]').click()");
  await waitFor("!document.body.classList.contains('markdown-full-preview-open')", "return from the full-page lesson preview");
  await evaluate(`(() => {
    document.querySelector('[data-ui-lab-answer][data-correct="true"]').click();
    document.querySelector('[data-ui-lab-check]').click();
    document.querySelector('[data-ui-lab-check]').click();
  })()`);
  await waitFor("document.querySelector('#ui-lab-response') && document.querySelector('.markdown-rendered-progress')?.getAttribute('aria-valuenow') === '3'", "the Explain It step in the complete authored sample");
  assert(await evaluate("document.querySelector('[data-authored-step]')?.textContent.includes('Explain it in your own words')"), "the complete Markdown sample must include Explain It");

  const codeQuestion = (name) => [
    ":::code-question",
    "title: Exact-name check",
    "instructions:",
    "Keep the semantic heading and match the requested name.",
    "requirements:",
    "- Keep an `<h1>` element.",
    "- Match `Mira the Explorer` exactly.",
    "html:",
    "```html",
    `<h1>${name}</h1>`,
    "```",
    "css:",
    "```css",
    "h1 { color: navy; }",
    "```",
    "checks:",
    "- html-selector | h1",
    "- file-contains | html | Mira the Explorer | case-sensitive",
    ":::"
  ].join("\n");
  const setAuthoredSource = async (source) => evaluate(`(() => {
    const input = document.querySelector('[data-markdown-input]');
    input.value = ${JSON.stringify(source)};
    input.dispatchEvent(new Event('input', { bubbles:true }));
  })()`);
  await setAuthoredSource(codeQuestion("MIRA THE EXPLORER"));
  await waitFor("Boolean(document.querySelector('.ds-practice-only .cm-editor'))", "the reusable code editor selected by Markdown");
  await evaluate("document.querySelector('[data-run-code]').click()");
  await waitFor("document.querySelectorAll('.ds-build-guide input[type=checkbox]')[0]?.checked === true", "the authored code checks");
  assert(await evaluate(`(() => {
    const checks = document.querySelectorAll('.ds-build-guide input[type="checkbox"]');
    return checks.length === 2 && checks[0].checked && !checks[1].checked
      && document.querySelector('[data-template-action-label]')?.textContent === 'RUN CHECK';
  })()`), "case-sensitive code checks must reject incorrect capitalization");
  await setAuthoredSource(codeQuestion("Mira the Explorer"));
  await waitFor("document.querySelector('.ds-practice-only .cm-content')?.textContent.includes('Mira the Explorer') && document.querySelector('[data-template-action-label]')?.textContent === 'RUN CHECK'", "the refreshed authored code editor");
  await evaluate("document.querySelector('[data-run-code]').click()");
  await waitFor("document.querySelector('[data-template-action-label]')?.textContent === 'CONTINUE'", "automatic code-question success");
  assert(await evaluate("[...document.querySelectorAll('.ds-build-guide input[type=checkbox]')].every((item) => item.checked)"), "a passing code question must satisfy every declarative requirement");

  await evaluate(`import('/src/ui/markdown-lab.js').then(({ SAMPLE_LESSON_MARKDOWN }) => {
    const input = document.querySelector('[data-markdown-input]');
    input.value = SAMPLE_LESSON_MARKDOWN;
    input.dispatchEvent(new Event('input', { bubbles:true }));
  })`);
  await waitFor("document.querySelector('.markdown-rendered-progress')?.getAttribute('aria-valuemax') === '7'", "the restored complete authored sample");
  await evaluate("document.querySelector('[data-preview-mode=\"document\"]').click()");
  await waitFor("Boolean(document.querySelector('[data-markdown-output] .markdown-youtube-player'))", "the authored document preview and card-free YouTube player");
  assert(await evaluate(`(() => {
    const player = document.querySelector('[data-markdown-output] .markdown-youtube-player');
    return player?.src === 'https://www.youtube-nocookie.com/embed/AlkDbnbv7dk?rel=0'
      && player.parentElement?.className === 'markdown-youtube'
      && player.parentElement.children.length === 1;
  })()`), "the Ready to Ship Markdown sample must include the card-free YouTube player");
  await evaluate("document.querySelector('.markdown-preview-scroll').scrollTop = document.querySelector('.markdown-preview-scroll').scrollHeight");
  await delay(120);
  await captureScreenshot("markdown-lab-sample.png");

  await cdp.send("Emulation.setDeviceMetricsOverride", { width:390, height:844, deviceScaleFactor:1, mobile:false }, sessionId);
  await delay(120);
  assert(await evaluate(`(() => {
    const editor = document.querySelector('.markdown-lab-editor');
    const preview = document.querySelector('.markdown-lab-preview');
    return getComputedStyle(editor).display !== 'none' && getComputedStyle(preview).display === 'none';
  })()`), "mobile Markdown Lab must open on the writing pane");
  await evaluate("document.querySelector('[data-markdown-pane=\"preview\"]').click()");
  await evaluate("document.querySelector('.markdown-tech-term').focus()");
  await waitFor("Number.parseFloat(getComputedStyle(document.querySelector('.markdown-tech-card')).opacity) === 1", "the mobile technical-term explanation card");
  const mobile = await evaluate(`(() => {
    const editor = document.querySelector('.markdown-lab-editor');
    const preview = document.querySelector('.markdown-lab-preview');
    const activeTab = document.querySelector('[data-markdown-pane="preview"]');
    const termCard = document.querySelector('.markdown-tech-card').getBoundingClientRect();
    const previewBounds = document.querySelector('.markdown-preview-scroll').getBoundingClientRect();
    return {
      previewVisible:getComputedStyle(preview).display !== 'none',
      editorHidden:getComputedStyle(editor).display === 'none',
      tabState:activeTab.getAttribute('aria-selected') === 'true',
      documentRendered:Boolean(preview.querySelector('h1') && preview.querySelector('table')),
      termCardVisible:Number.parseFloat(getComputedStyle(document.querySelector('.markdown-tech-card')).opacity) === 1,
      termCardContained:termCard.left >= previewBounds.left + 10 && termCard.right <= previewBounds.right - 10,
      noPageScroll:document.scrollingElement.scrollHeight <= innerHeight,
      noHorizontalOverflow:document.documentElement.scrollWidth <= innerWidth,
    };
  })()`);
  assert(Object.values(mobile).every(Boolean), `mobile Markdown Lab layout failed: ${JSON.stringify(mobile)}`);
  await captureScreenshot("markdown-lab-mobile.png");
  await evaluate(`(() => {
    document.activeElement?.blur();
    const preview = document.querySelector('.markdown-preview-scroll');
    preview.scrollTop = preview.scrollHeight;
  })()`);
  await delay(120);
  await captureScreenshot("markdown-lab-sample-mobile.png");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width:1280, height:900, deviceScaleFactor:1, mobile:false }, sessionId);
  await delay(120);
}
