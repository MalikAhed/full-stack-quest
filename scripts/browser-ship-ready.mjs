import { verifyReviewedResponse } from "./browser-reviewed-response.mjs";
import { verifyMarkdownLab } from "./browser-markdown-lab.mjs";

export async function verifyShipReadyTemplates({ assert, captureScreenshot, cdp, delay, evaluate, sessionId, waitFor }) {
  await evaluate("document.querySelector('[data-more-tab=\"ship-ready\"]').click()");
  await waitFor("Boolean(document.querySelector('[data-open-template=\"ship-ready-mcq\"]'))", "the Ship Ready templates");
  assert(await evaluate(`(() => {
    const cards = [...document.querySelectorAll('#ship-ready-panel .ship-ready-card')];
    const routes = cards.map((card) => card.querySelector('[data-preview-route]')?.dataset.previewRoute);
    const buttons = cards.map((card) => card.querySelector('[data-open-template]')?.dataset.openTemplate);
    return cards.length === 8
      && cards[0].querySelector('h3')?.textContent === 'Markdown'
      && cards[1].querySelector('h3')?.textContent === 'Content Area'
      && cards[2].querySelector('h3')?.textContent === 'MCQ Template'
      && cards[3].querySelector('h3')?.textContent === 'Explain It'
      && cards[4].querySelector('h3')?.textContent === 'Put in Order'
      && cards[5].querySelector('h3')?.textContent === 'Fill in the Blanks'
      && cards[5].querySelectorAll('.ship-ready-fill-options .lesson-inline-code').length === 3
      && cards[6].querySelector('h3')?.textContent === 'Spot the Bug'
      && cards[7].querySelector('h3')?.textContent === 'Code Editor'
      && JSON.stringify(routes) === JSON.stringify(['ship-ready-markdown','ship-ready','ship-ready-mcq','ship-ready-response','ship-ready-sequence','ship-ready-fill-blanks','ship-ready-spot-bug','ship-ready-code-lab'])
      && JSON.stringify(buttons) === JSON.stringify(['ship-ready-markdown','ship-ready','ship-ready-mcq','ship-ready-response','ship-ready-sequence','ship-ready-fill-blanks','ship-ready-spot-bug','ship-ready-code-lab']);
  })()`), "Ship Ready cards must stay in the approved order and use previews of the exact routes they open");
  await captureScreenshot("ship-ready-previews.png");

  await evaluate("document.querySelector('[data-open-template=\"ship-ready-markdown\"]').click()");
  await waitFor("location.search === '?view=ship-ready-markdown' && Boolean(document.querySelector('[data-markdown-input]'))", "the Ship Ready Markdown template");
  await verifyMarkdownLab({ assert, captureScreenshot, cdp, delay, evaluate, sessionId, waitFor });
  await evaluate("document.querySelector('.lesson-back').click()");
  await waitFor("Boolean(document.querySelector('[data-open-template=\"ship-ready-sequence\"]'))", "the Ship Ready templates after closing Markdown");

  await evaluate("document.querySelector('[data-open-template=\"ship-ready-sequence\"]').click()");
  await waitFor("location.search === '?view=ship-ready-sequence' && document.body.classList.contains('ui-lab-sequence-open')", "the Ship Ready Put in Order template");
  assert(await evaluate("document.querySelector('#ui-lab-content-title').textContent === 'Put the link journey in order'"), "the Ship Ready sequence route must render Put in Order");
  await evaluate(`['click','request','response','render'].forEach((id) => document.querySelector('[data-sequence-step="' + id + '"]').click()); document.querySelector('[data-sequence-check]').click()`);
  assert(await evaluate("document.querySelector('[data-sequence-feedback]').classList.contains('is-correct')"), "the data-driven Put in Order template must accept its configured sequence");
  await evaluate("document.querySelector('[data-sequence-check]').click()");
  await waitFor("Boolean(document.querySelector('[data-open-template=\"ship-ready-fill-blanks\"]'))", "the Ship Ready templates after closing Put in Order");

  await evaluate("document.querySelector('[data-open-template=\"ship-ready-fill-blanks\"]').click()");
  await waitFor("location.search === '?view=ship-ready-fill-blanks' && document.body.classList.contains('ui-lab-fill-open')", "the Ship Ready Fill in the Blanks template");
  assert(await evaluate(`(() => {
    const choice = document.querySelector('.ui-lab-fill-options button');
    const inlineCode = choice.querySelector('.lesson-inline-code');
    const choiceStyle = getComputedStyle(choice);
    const codeStyle = getComputedStyle(inlineCode);
    return document.querySelector('#ui-lab-content-title').textContent === 'Complete the fetch request'
      && document.querySelectorAll('.ui-lab-fill-options .lesson-inline-code').length === 4
      && choiceStyle.minHeight === '72px'
      && choiceStyle.borderRadius === '14px'
      && codeStyle.backgroundColor === 'rgba(0, 0, 0, 0)'
      && codeStyle.borderTopWidth === '0px';
  })()`), "the Ship Ready fill route must use MCQ cards without a second inline-code surface");
  await evaluate(`['"/api/users"','"GET"'].forEach((value) => [...document.querySelectorAll('[data-fill-option]')].find((option) => option.dataset.fillOption === value).click()); document.querySelector('[data-fill-check]').click()`);
  assert(await evaluate("document.querySelector('[data-fill-feedback]').classList.contains('is-correct')"), "the data-driven Fill in the Blanks template must accept its configured answers");
  assert(await evaluate("document.querySelectorAll('.level-layout-actions').length === 1 && Boolean(document.querySelector('[data-template-back]'))"), "Fill in the Blanks must use the shared approved footer");
  await evaluate("document.querySelector('[data-fill-check]').click()");
  await waitFor("Boolean(document.querySelector('[data-open-template=\"ship-ready\"]'))", "the Ship Ready templates after closing Fill in the Blanks");

  await evaluate("document.querySelector('[data-open-template=\"ship-ready\"]').click()");
  await waitFor("location.search === '?view=ship-ready' && Boolean(document.querySelector('.ui-lab-content-placeholder'))", "the Ship Ready lesson shell");
  assert(await evaluate("document.querySelectorAll('.level-layout-actions').length === 1 && Boolean(document.querySelector('[data-template-back]'))"), "the Content Area must use the shared approved footer");
  await captureScreenshot("template-lesson-shell.png");
  await evaluate("document.querySelector('[data-template-primary]').click()");
  await waitFor("location.search === '?page=more'", "return from the Ship Ready lesson shell");

  await evaluate("document.querySelector('[data-open-template=\"ship-ready-response\"]').click()");
  await waitFor("location.search === '?view=ship-ready-response' && document.body.classList.contains('ui-lab-response-open')", "the Ship Ready response template");
  assert(await evaluate("document.querySelector('#ui-lab-content-title').textContent === 'Request vs response'"), "the Ship Ready response route must render Explain It");
  await captureScreenshot("template-explain-it.png");
  await verifyReviewedResponse({ assert, captureScreenshot, cdp, delay, evaluate, sessionId, waitFor });
  await evaluate("document.querySelector('[data-response-submit]').click()");
  await waitFor("location.search === '?page=more'", "return from the Ship Ready response template");

  await evaluate("document.querySelector('[data-open-template=\"ship-ready-mcq\"]').click()");
  await waitFor("document.body.classList.contains('ui-lab-mcq-open')", "the Ship Ready MCQ template");
  await captureScreenshot("template-mcq.png");
  const mcqChrome = await evaluate(`(() => {
    const progress = document.querySelector('.lesson-top-title').getBoundingClientRect();
    const close = document.querySelector('.lesson-back').getBoundingClientRect();
    return {
      topControlsAligned:Math.abs((progress.top + progress.bottom) / 2 - (close.top + close.bottom) / 2) <= 1,
      lighterFooterDivider:getComputedStyle(document.querySelector('.level-layout-actions')).borderTopColor === 'rgb(217, 220, 222)',
    };
  })()`);
  assert(Object.values(mcqChrome).every(Boolean), `MCQ chrome alignment failed: ${JSON.stringify(mcqChrome)}`);
  await evaluate("document.querySelector('[data-ui-lab-answer=\"201\"]').click(); document.querySelector('[data-ui-lab-check]').click()");
  assert(await evaluate("Boolean(document.querySelector('.level-feedback .lesson-inline-code'))"), "Ship Ready MCQ feedback must use the shared Markdown inline-code style");
  await evaluate("document.querySelector('.ui-lab-mcq').style.paddingBottom = '900px'");
  await waitFor("document.querySelector('.level-layout-task').classList.contains('has-more-content')", "the MCQ overflow indicator");
  assert(await evaluate("getComputedStyle(document.querySelector('[data-content-scroll]')).display === 'grid'"), "overflowing MCQ content must show its down arrow");
  await evaluate("document.querySelector('[data-content-scroll]').click()");
  await waitFor("document.querySelector('.level-layout-task').scrollTop > 0", "MCQ content scrolling");
  await evaluate("document.querySelector('[data-ui-lab-check]').click()");
  await waitFor("location.search === '?page=more'", "return from the Ship Ready MCQ");

  await evaluate("document.querySelector('[data-open-template=\"ship-ready-spot-bug\"]').click()");
  await waitFor("location.search === '?view=ship-ready-spot-bug' && document.body.classList.contains('ui-lab-bug-open')", "the Ship Ready Spot the Bug template");
  assert(await evaluate("document.querySelector('#ui-lab-content-title').textContent === 'Which line breaks the code?'"), "the Ship Ready Spot the Bug route must render the approved debugging question");
  await evaluate("document.querySelector('[data-bug-line=\"3\"]').click(); document.querySelector('[data-bug-reason=\"parenthesis\"]').click(); document.querySelector('[data-bug-check]').click()");
  assert(await evaluate("document.querySelector('[data-bug-feedback]').classList.contains('is-correct')"), "the data-driven Spot the Bug template must accept its configured line and reason");
  await evaluate("document.querySelector('[data-bug-check]').click()");
  await waitFor("location.search === '?page=more'", "return from the Ship Ready Spot the Bug template");

  await evaluate("document.querySelector('[data-open-template=\"ship-ready-code-lab\"]').click()");
  await waitFor("location.search === '?view=ship-ready-code-lab' && Boolean(document.querySelector('.ds-build-guide > .markdown-rendered')) && Boolean(document.querySelector('.cm-editor'))", "the Ship Ready Code Editor template");
  await waitFor("document.querySelector('[data-console-output]')?.textContent.includes('Explorer card ready: Mira the Explorer')", "JavaScript execution in the Code Editor template");
  const codeLabState = await evaluate(`(() => ({
    markdownChecklist:document.querySelectorAll('.ds-build-guide input[type="checkbox"]').length === 2,
    noLegacyCards:!document.querySelector('.ds-build-brief, .ds-code-requirements, .ds-build-tip'),
    editorTouchesFooter:Math.abs(document.querySelector('.ds-code-lab').getBoundingClientRect().bottom - document.querySelector('.ds-quest-footer').getBoundingClientRect().top) <= 3,
    noBottomBorder:getComputedStyle(document.querySelector('.ds-code-lab')).borderBottomWidth === '0px',
    uiLabRouteRemoved:location.search !== '?view=ui-lab',
    sharedFooter:document.querySelectorAll('.level-layout-actions').length === 1 && Boolean(document.querySelector('[data-template-back]')),
    threeEditors:document.querySelectorAll('[data-editor-tab]').length === 3 && document.querySelectorAll('.cm-editor').length === 3,
    javascriptTab:Boolean(document.querySelector('[data-editor-tab="js"] .ds-language-logo')),
    sandboxedScripts:document.querySelector('.ds-live-preview').getAttribute('sandbox') === 'allow-scripts',
    outputTabs:document.querySelectorAll('[data-output-tab]').length === 2,
    compactRunAction:document.querySelector('[data-run-code]').getBoundingClientRect().width < 190,
    unboxedSolidPlayIcon:Boolean(document.querySelector('[data-run-code] .ds-run-play svg path'))
      && getComputedStyle(document.querySelector('.ds-run-play')).backgroundColor === 'rgba(0, 0, 0, 0)'
      && getComputedStyle(document.querySelector('.ds-run-play svg')).fill !== 'none',
  }))()`);
  assert(Object.values(codeLabState).every(Boolean), `Ship Ready Code Editor state failed: ${JSON.stringify(codeLabState)}`);
  await evaluate("document.querySelector('[data-editor-tab=\"js\"]').click(); document.querySelector('[data-editor-host=\"js\"] .cm-content').focus()");
  await cdp.send("Input.dispatchKeyEvent", { type:"keyDown", modifiers:2, key:" ", code:"Space", windowsVirtualKeyCode:32 }, sessionId);
  await cdp.send("Input.dispatchKeyEvent", { type:"keyUp", modifiers:2, key:" ", code:"Space", windowsVirtualKeyCode:32 }, sessionId);
  await waitFor("Boolean(document.querySelector('[data-editor-host=\"js\"] .cm-tooltip-autocomplete'))", "JavaScript autocomplete suggestions");
  await evaluate("document.querySelector('[data-output-tab=\"console\"]').click()");
  assert(await evaluate(`(() => document.querySelector('[data-output-tab="console"]').classList.contains('is-active')
    && document.querySelector('[data-output-panel="preview"]').hidden
    && !document.querySelector('[data-output-panel="console"]').hidden
    && document.querySelector('[data-console-output]').textContent.includes('Explorer card ready: Mira the Explorer'))()`), "the Code Editor must switch between Preview and Console without losing JavaScript output");
  await captureScreenshot("code-editor-js-console.png");
  await evaluate("document.querySelector('[data-template-back]').click()");
  await waitFor("location.search === '?page=more'", "return from the Ship Ready Code Editor template");
  await evaluate("document.querySelector('[data-open-template=\"ship-ready-code-lab\"]').click()");
  await waitFor("location.search === '?view=ship-ready-code-lab' && document.querySelectorAll('.cm-editor').length === 3", "reopening the same Ship Ready Code Editor template");
  assert(await evaluate("!document.querySelector('.ds-editor-hint')"), "the Code Editor tab bar must not show the Ctrl + Space shortcut hint");
  await evaluate("document.querySelector('[data-template-back]').click()");
  await waitFor("location.search === '?page=more'", "return after reopening the Ship Ready Code Editor template");
}
