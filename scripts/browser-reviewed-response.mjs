export async function verifyReviewedResponse({ assert, captureScreenshot, cdp, delay, evaluate, sessionId, waitFor }) {
  await cdp.send("Emulation.setDeviceMetricsOverride", { width:1280, height:900, deviceScaleFactor:1, mobile:false }, sessionId);
  await evaluate(`(() => {
    const response = document.querySelector('#ui-lab-response');
    response.value = 'A client sends an HTTP request to a server, and the server returns a response. For example, a browser can send a GET request to an API, which returns the requested data with a status code.';
    response.dispatchEvent(new Event('input', { bubbles:true }));
    document.querySelector('[data-response-submit]').click();
  })()`);
  await waitFor("document.body.classList.contains('response-reviewed') && document.body.classList.contains('review-pass')", "a passing explanation review");
  await waitFor("Boolean(document.querySelector('.ui-lab-pinata'))", "the passing explanation celebration");
  assert(await evaluate("document.querySelector('[data-review-message] strong').textContent.endsWith('10/10 · Passed')"), "a passing explanation must show its score before the feedback");
  assert(await evaluate(`[
    document.querySelector('[data-review-message]'),
    document.querySelector('.ui-lab-thinking-mascot'),
    document.querySelector('.ui-lab-response-answer'),
  ].some((element) => element.getAnimations().some((animation) => animation.playState === 'running'))`), "the reviewed response must animate out of the reviewing layout");
  await waitFor("!document.querySelector('[data-review-message]').classList.contains('is-typing') && !document.querySelector('.ui-lab-pinata')", "the reviewed response to settle");
  const desktopLayout = await evaluate(`(() => {
    const stage = document.querySelector('[data-review-mascot]').getBoundingClientRect();
    const mascot = document.querySelector('.ui-lab-thinking-mascot').getBoundingClientRect();
    const messageElement = document.querySelector('[data-review-message]');
    const message = messageElement.getBoundingClientRect();
    const answer = document.querySelector('.ui-lab-response-answer').getBoundingClientRect();
    const curvedTail = getComputedStyle(messageElement, '::before');
    return {
      expandedMessage:message.width >= 400 && message.height >= 180,
      mascotAtLowerLeft:mascot.left < message.left && Math.abs(mascot.bottom - stage.bottom) <= 1,
      answerRemainsVisible:answer.width >= 340 && answer.right <= innerWidth + 1,
      curvedHeadTail:parseFloat(curvedTail.borderBottomLeftRadius) >= 20 && parseFloat(curvedTail.left) < 0,
      noHorizontalOverflow:document.documentElement.scrollWidth <= innerWidth,
    };
  })()`);
  assert(Object.values(desktopLayout).every(Boolean), `reviewed response layout failed: ${JSON.stringify(desktopLayout)}`);
  await captureScreenshot("ui-lab-response-result-desktop.png");

  await cdp.send("Emulation.setDeviceMetricsOverride", { width:390, height:844, deviceScaleFactor:1, mobile:false }, sessionId);
  await delay(180);
  const mobileLayout = await evaluate(`(() => {
    const stage = document.querySelector('[data-review-mascot]').getBoundingClientRect();
    const mascot = document.querySelector('.ui-lab-thinking-mascot').getBoundingClientRect();
    const message = document.querySelector('[data-review-message]').getBoundingClientRect();
    const answer = document.querySelector('.ui-lab-response-answer').getBoundingClientRect();
    const footer = document.querySelector('.level-layout-actions').getBoundingClientRect();
    return {
      stacked:message.bottom <= answer.top + 1,
      mascotAtLowerLeft:mascot.left < message.left && Math.abs(mascot.bottom - stage.bottom) <= 1,
      resultAboveFooter:answer.bottom <= footer.top + 1,
      noPageScroll:document.scrollingElement.scrollHeight <= innerHeight,
      noHorizontalOverflow:document.documentElement.scrollWidth <= innerWidth,
    };
  })()`);
  assert(Object.values(mobileLayout).every(Boolean), `mobile reviewed response layout failed: ${JSON.stringify(mobileLayout)}`);
  await captureScreenshot("ui-lab-response-result-mobile.png");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width:1280, height:900, deviceScaleFactor:1, mobile:false }, sessionId);
  await delay(120);
}
