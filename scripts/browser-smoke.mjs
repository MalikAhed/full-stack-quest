import { spawn } from "node:child_process";
import { once } from "node:events";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyShipReadyTemplates } from "./browser-ship-ready.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const browserErrors = [];
const failedLocalRequests = [];
const failedExternalRequests = [];
const serverErrors = [];
const allowExternalAssets = process.env.BROWSER_EXTERNAL_ASSETS === "1";
const screenshotDirectory = process.env.BROWSER_SCREENSHOT_DIR;
const screenshotFilter = process.env.BROWSER_SCREENSHOT_FILTER;

class ScreenshotCaptureComplete extends Error { constructor(filename) { super(filename); this.filename = filename; } }
function assert(condition, message) {
  if (!condition) failures.push(message);
}
function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
async function terminateProcess(processHandle) {
  if (!processHandle || processHandle.exitCode !== null || processHandle.signalCode !== null) return;
  const exited = once(processHandle, "exit");
  processHandle.kill("SIGTERM");
  await Promise.race([exited, delay(2_000)]);
  if (processHandle.exitCode === null && processHandle.signalCode === null) {
    const forcedExit = once(processHandle, "exit");
    processHandle.kill("SIGKILL");
    await forcedExit;
  }
}
async function findChrome() {
  const candidates = [process.env.CHROME_BIN, "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  throw new Error("Chrome or Chromium is required for browser smoke tests. Set CHROME_BIN to its executable.");
}
async function getAvailablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}
function rawRequest(port, target, method = "GET") {
  return new Promise((resolve, reject) => {
    const outgoing = request({ host:"127.0.0.1", port, path:target, method }, (response) => {
      response.resume();
      response.once("end", () => resolve(response.statusCode));
    });
    outgoing.once("error", reject);
    outgoing.end();
  });
}
class CdpPipe {
  constructor(processHandle) {
    this.process = processHandle;
    this.pending = new Map();
    this.nextId = 1;
    this.buffer = Buffer.alloc(0);
    this.listeners = new Set();
    processHandle.stdio[4].on("data", (chunk) => this.handleData(chunk));
  }

  handleData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    let boundary = this.buffer.indexOf(0);
    while (boundary >= 0) {
      const payload = this.buffer.subarray(0, boundary).toString("utf8");
      this.buffer = this.buffer.subarray(boundary + 1);
      if (payload) this.handleMessage(JSON.parse(payload));
      boundary = this.buffer.indexOf(0);
    }
  }

  handleMessage(message) {
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
      else pending.resolve(message.result);
      return;
    }
    this.listeners.forEach((listener) => listener(message));
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.process.stdio[3].write(`${JSON.stringify(payload)}\0`);
    });
  }

  onEvent(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
async function waitForServer(port) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      if (await rawRequest(port, "/") === 200) return;
    } catch (error) {
      if (error?.code !== "ECONNREFUSED") throw error;
    }
    await delay(50);
  }
  throw new Error("Development server did not become ready.");
}
let serverProcess;
let chromeProcess;
let profileDirectory;
let simulateStaticDocument = false;
try {
  const port = await getAvailablePort();
  const appUrl = `http://127.0.0.1:${port}/`;
  serverProcess = spawn(process.execPath, ["dev-server.mjs"], {
    cwd:projectRoot,
    env:{
      ...process.env,
      PORT:String(port),
      EXPLAIN_REVIEW_CLI:process.env.EXPLAIN_REVIEW_CLI || path.join(projectRoot, "tests/fixtures/mock-codex.mjs"),
    },
    stdio:["ignore", "pipe", "pipe"],
  });
  serverProcess.stdout.resume();
  serverProcess.stderr.on("data", (chunk) => serverErrors.push(chunk.toString("utf8").trim()));
  await waitForServer(port);

  assert(await rawRequest(port, "/%E0%A4%A") === 400, "malformed URL must return 400 without crashing the server");
  assert(await rawRequest(port, "/%00") === 400, "null bytes in URL paths must return 400 without crashing the server");
  assert(await rawRequest(port, "/", "POST") === 405, "unsupported HTTP methods must return 405");
  assert(await rawRequest(port, "/", "HEAD") === 200, "HEAD requests must return the resource status without a response body");
  assert(await rawRequest(port, "/") === 200, "server must remain available after a malformed URL");

  const chrome = await findChrome();
  profileDirectory = await mkdtemp(path.join(tmpdir(), "fsq-chrome-"));
  chromeProcess = spawn(chrome, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-background-networking",
    "--remote-debugging-pipe",
    `--user-data-dir=${profileDirectory}`,
    "about:blank",
  ], { stdio:["ignore", "ignore", "pipe", "pipe", "pipe"] });
  chromeProcess.stderr.resume();

  const cdp = new CdpPipe(chromeProcess);
  const { targetId } = await cdp.send("Target.createTarget", { url:"about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten:true });
  await Promise.all([
    cdp.send("Page.enable", {}, sessionId),
    cdp.send("Runtime.enable", {}, sessionId),
    cdp.send("Log.enable", {}, sessionId),
    cdp.send("Network.enable", {}, sessionId),
    cdp.send("Fetch.enable", {
      patterns:[{ urlPattern:`${appUrl}*`, resourceType:"Document", requestStage:"Response" }],
    }, sessionId),
  ]);

  const requestUrls = new Map();
  cdp.onEvent((message) => {
    if (message.sessionId !== sessionId) return;
    if (message.method === "Fetch.requestPaused") {
      void (async () => {
        const response = await cdp.send("Fetch.getResponseBody", { requestId:message.params.requestId }, sessionId);
        let html = Buffer.from(response.body, response.base64Encoded ? "base64" : "utf8").toString("utf8");
        if (simulateStaticDocument) html = html.replace("<script>window.__FULL_STACK_QUEST_DEV__=true;</script>", "");
        if (!allowExternalAssets) {
          html = html
            .replace("<head>", "<head><script>window.__FULL_STACK_QUEST_DISABLE_EXTERNALS__=true;</script>")
            .replace(/\s*<link[^>]+href="https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^"]*"[^>]*>/g, "")
            .replace(/\s*<link[^>]+href="https:\/\/cdn\.jsdelivr\.net[^"]*"[^>]*>/g, "")
            .replace(/\s*<script[^>]+src="https:\/\/cdn\.jsdelivr\.net[^"]*"[^>]*><\/script>/g, "");
        }
        const responseHeaders = (message.params.responseHeaders || [])
          .filter(({ name }) => name.toLowerCase() !== "content-length");
        await cdp.send("Fetch.fulfillRequest", {
          requestId:message.params.requestId,
          responseCode:message.params.responseStatusCode,
          responseHeaders,
          body:Buffer.from(html).toString("base64"),
        }, sessionId);
      })().catch((error) => browserErrors.push(`Could not prepare the deterministic test document: ${error.message}`));
      return;
    }
    if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails.text);
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
      browserErrors.push(message.params.args.map((argument) => argument.value || argument.description || "console error").join(" "));
    }
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") browserErrors.push(message.params.entry.text);
    if (message.method === "Network.requestWillBeSent") requestUrls.set(message.params.requestId, message.params.request.url);
    if (message.method === "Network.loadingFailed" && message.params.errorText !== "net::ERR_ABORTED") {
      const requestUrl = requestUrls.get(message.params.requestId) || message.params.requestId;
      if (requestUrl.startsWith(appUrl)) failedLocalRequests.push(`${message.params.errorText}: ${requestUrl}`);
      else if (allowExternalAssets && /(?:fonts\.(?:googleapis|gstatic)\.com|cdn\.jsdelivr\.net)/.test(requestUrl)) {
        failedExternalRequests.push(`${message.params.errorText}: ${requestUrl}`);
      }
    }
  });

  async function evaluate(expression) {
    const response = await cdp.send("Runtime.evaluate", { expression, returnByValue:true, awaitPromise:true }, sessionId);
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    }
    return response.result.value;
  }

  async function waitFor(expression, label) {
    const attempts = allowExternalAssets ? 400 : 160;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await delay(50);
    }
    const errorContext = browserErrors.length ? ` Browser errors: ${browserErrors.join(" | ")}` : "";
    throw new Error(`Timed out waiting for ${label}.${errorContext}`);
  }

  async function navigate(url) {
    await cdp.send("Page.navigate", { url }, sessionId);
    await waitFor("document.readyState !== 'loading'", url);
  }

  async function captureScreenshot(filename) {
    if (!screenshotDirectory) return;
    if (screenshotFilter && filename !== screenshotFilter) return;
    await mkdir(screenshotDirectory, { recursive:true });
    await waitFor("!document.fonts || document.fonts.status === 'loaded'", "document fonts");
    await delay(180);
    const { data } = await cdp.send("Page.captureScreenshot", {
      format:"png",
      fromSurface:true,
      captureBeyondViewport:false,
    }, sessionId);
    await writeFile(path.join(screenshotDirectory, filename), Buffer.from(data, "base64"));
    if (screenshotFilter) throw new ScreenshotCaptureComplete(filename);
  }

  await cdp.send("Emulation.setDeviceMetricsOverride", { width:1440, height:900, deviceScaleFactor:1, mobile:false }, sessionId);
  await navigate(appUrl);
  await waitFor("document.querySelectorAll('.level[data-day]').length === 112", "the 112-day course map");
  const course = await evaluate(`(() => ({
    weeks:document.querySelectorAll('.course-unit').length,
    days:document.querySelectorAll('.level[data-day]').length,
    overflow:document.documentElement.scrollWidth > document.documentElement.clientWidth,
    heading:document.querySelector('h1')?.textContent,
    lazyImages:document.querySelectorAll('.course-unit:nth-child(n+3) img[loading="lazy"]').length,
    eagerImages:document.querySelectorAll('.course-unit:nth-child(-n+2) img[loading="eager"]').length,
    highPriorityImages:document.querySelectorAll('.course-unit:nth-child(-n+2) img[fetchpriority="high"]').length,
  }))()`);
  assert(course.weeks === 16, `course map rendered ${course.weeks} weeks instead of 16`);
  assert(course.days === 112, `course map rendered ${course.days} days instead of 112`);
  assert(course.overflow === false, "desktop course map has horizontal overflow");
  assert(course.heading?.includes("daily learning path"), "course map is missing its accessible page heading");
  assert(course.lazyImages === 28 && course.eagerImages === 4 && course.highPriorityImages === 2, "off-screen map artwork must be lazy while only the first week is forced to high priority");
  assert(!await evaluate("Boolean(document.querySelector('.course-units [data-design-system]'))"), "the learning map must not expose development references");
  const initialResources = await evaluate("performance.getEntriesByType('resource').map(({ name }) => name)");
  assert(!initialResources.some((url) => url.includes("/src/styles/design-system") || url.includes("/src/ui/design-system-view.js")), "the normal learning path must not preload Design System resources");

  const lessonStepState = await evaluate(`(async () => {
    const [{ defineLesson }, { renderLesson }] = await Promise.all([import('/src/domain/lesson.js'), import('/src/ui/lesson-view.js')]);
    const host = document.createElement('div');
    document.body.append(host);
    const lesson = defineLesson({ title:'Test quest', summary:'Exercise progress mapping.', steps:[
      { id:'first-step', title:'First step', body:'First body.' },
      { id:'second-step', title:'Second step', body:'Second body.' },
    ] });
    let latestProgress = null;
    const rendered = renderLesson(host, 1, lesson, { onProgress:(progress) => { latestProgress = progress; } });
    host.querySelector('[data-flow-next]').click();
    const state = { visibleStep:host.querySelector('[data-lesson-step]:not([hidden])').dataset.lessonStep, completedStepIds:latestProgress.completedStepIds };
    rendered.destroy();
    host.remove();
    return state;
  })()`);
  assert(lessonStepState.visibleStep === "second-step", "continuing must reveal exactly the next lesson step");
  assert(lessonStepState.completedStepIds[0] === "first-step", "lesson progress events must use stable step ids");

  await evaluate("document.querySelector('[data-day=\"1\"]').click()");
  await waitFor("document.querySelector('.lesson-flow') && document.querySelector('#lesson-content').getAttribute('aria-busy') === 'false'", "day 1 interactive lesson");
  assert(await evaluate(`(() => { const lesson = document.querySelector('.lesson-flow'); return document.querySelector('.lesson-status').textContent === 'IN PROGRESS'
    && lesson.querySelectorAll('[data-live-authored-step]').length === 1 && lesson.querySelector('[data-live-authored-step] h1')?.textContent === 'How the web actually works' && lesson.querySelectorAll('[data-live-authored-step] h1').length === 1 && lesson.querySelectorAll('img[src*="assets/lessons/day-001/"]').length === 0 && document.querySelector('.lesson-markdown-toggle')?.textContent === 'MARKDOWN' && document.body.classList.contains('ready-lesson-open') && document.querySelector('.lesson-top-title[role="progressbar"]')?.getAttribute('aria-valuemax') === '19'
    && lesson.querySelectorAll('.level-layout-preview').length === 1 && lesson.querySelectorAll('.level-layout-actions').length === 1 && !lesson.querySelector('.lesson-flow-header, .lesson-progress-track, .lesson-stage, .lesson-hero--quest, .lesson-rail, .lesson-mission') && getComputedStyle(document.querySelector('#lesson-content')).borderTopWidth === '0px' && Boolean(document.querySelector('[data-lesson-markdown-input]')); })()`), "Day 1 must render one detailed authored step through the locked lesson shell");
  const recapDiagramState = await evaluate(`(async () => {
    const lessonPaths = [1, 2, 3, 4, 5, 6, 7].map((day) => '/src/data/lessons/candidates/day-' + String(day).padStart(3, '0') + '.js');
    const [lessonModules, { renderMarkdownDocument }] = await Promise.all([
      Promise.all(lessonPaths.map((lessonPath) => import(lessonPath))),
      import('/src/markdown/renderer.js'),
    ]);
    const imageMarkdown = lessonModules.map(({ LESSON_MARKDOWN }) => LESSON_MARKDOWN.match(/^!\\[[^\\n]+\\]\\(assets\\/lessons\\/day-\\d{3}\\/[^\\n)]+\\.webp\\)$/m)?.[0]).filter(Boolean);
    const host = document.createElement('div');
    host.className = 'markdown-rendered';
    host.style.width = '700px';
    host.style.position = 'absolute';
    host.style.left = '0';
    host.style.top = '0';
    host.style.zIndex = '-1';
    host.innerHTML = renderMarkdownDocument(imageMarkdown.join('\\n\\n'));
    document.body.append(host);
    const images = [...host.querySelectorAll('img')];
    await Promise.all(images.map((image) => image.complete
      ? Promise.resolve()
      : new Promise((resolve) => { image.addEventListener('load', resolve, { once:true }); image.addEventListener('error', resolve, { once:true }); })));
    const hostBounds = host.getBoundingClientRect();
    const diagrams = images.map((image) => { const bounds = image.getBoundingClientRect(); return { src:image.getAttribute('src'), complete:image.complete, naturalWidth:image.naturalWidth, naturalHeight:image.naturalHeight, width:bounds.width, height:bounds.height, contained:bounds.left >= hostBounds.left && bounds.right <= hostBounds.right + 0.5, capped:bounds.height <= 340.5 }; });
    host.remove();
    return { authoredImages:imageMarkdown.length, diagrams };
  })()`);
  assert(recapDiagramState.authoredImages === 7 && recapDiagramState.diagrams.length === 7, `all seven lessons must expose exactly one recap diagram (${JSON.stringify(recapDiagramState)})`);
  assert(recapDiagramState.diagrams.every((diagram) => diagram.complete && diagram.naturalWidth > 0 && diagram.naturalHeight > 0 && diagram.contained && diagram.capped), `all recap diagrams must load and obey the renderer image cap (${JSON.stringify(recapDiagramState)})`);
  assert(await evaluate("document.activeElement?.hasAttribute('data-live-authored-step') === true"), "opening a lesson from the map must focus the active authored step");
  await waitFor("document.querySelector('#lesson-content .level-layout-task')?.classList.contains('has-more-content')", "the Day 1 Markdown scroll indicator");
  assert(await evaluate("getComputedStyle(document.querySelector('#lesson-content [data-content-scroll]')).display === 'grid'"), "overflowing authored Markdown must show the lesson scroll indicator");
  await evaluate("document.querySelector('#lesson-content [data-content-scroll]').click()");
  await waitFor("document.querySelector('#lesson-content .level-layout-task').scrollTop > 0", "the Day 1 scroll indicator moving the content");
  await evaluate("document.querySelector('#lesson-content .level-layout-task').scrollTo({ top:0, behavior:'instant' })");
  const dayOneScrollTarget = await evaluate(`(() => { const bounds = document.querySelector('#lesson-content .level-layout-task').getBoundingClientRect(); return { x:Math.round(bounds.left + bounds.width / 2), y:Math.round(bounds.top + bounds.height / 2) }; })()`);
  await cdp.send("Input.dispatchMouseEvent", { type:"mouseMoved", x:dayOneScrollTarget.x, y:dayOneScrollTarget.y }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type:"mouseWheel", x:dayOneScrollTarget.x, y:dayOneScrollTarget.y, deltaX:0, deltaY:500 }, sessionId);
  await delay(240);
  const dayOneScrollState = await evaluate(`(() => {
    const task = document.querySelector('#lesson-content .level-layout-task'); const taskBounds = task.getBoundingClientRect();
    const state = { clientHeight:task.clientHeight, scrollHeight:task.scrollHeight, scrolled:task.scrollTop, overflowY:getComputedStyle(task).overflowY, taskBottom:Math.round(taskBounds.bottom), footerTop:Math.round(document.querySelector('#lesson-content .level-layout-actions').getBoundingClientRect().top) };
    state.ok = state.scrollHeight > state.clientHeight && state.scrolled > 0 && state.overflowY === 'auto' && state.footerTop >= state.taskBottom - 1;
    task.scrollTo({ top:0, behavior:'instant' });
    return state;
  })()`);
  assert(dayOneScrollState.ok, `Day 1 authored content must scroll inside the locked footer shell (${JSON.stringify(dayOneScrollState)})`);
  await evaluate("document.querySelector('#lesson-content .level-layout-task').scrollTo({ top:document.querySelector('#lesson-content .level-layout-task').scrollHeight, behavior:'instant' })");
  await waitFor("!document.querySelector('#lesson-content .level-layout-task')?.classList.contains('has-more-content')", "the Day 1 scroll indicator hiding at the end of the content");
  await evaluate("document.querySelector('#lesson-content .level-layout-task').scrollTo({ top:0, behavior:'instant' })");
  await evaluate("document.querySelector('.lesson-markdown-toggle').click()");
  await waitFor("!document.querySelector('.lesson-markdown-source').hidden", "the live Day 1 Markdown source");
  await evaluate(`(() => {
    const input = document.querySelector('[data-lesson-markdown-input]');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles:true }));
  })()`);
  await waitFor("document.querySelectorAll('#lesson-content [data-live-authored-step]').length === 0 && document.querySelector('#lesson-content')?.textContent.includes('no authored content')", "deleting the Markdown deletes the rendered lesson steps");
  assert(await evaluate("document.querySelector('.lesson-top-title')?.getAttribute('aria-valuemax') === '0' && document.querySelector('[data-lesson-markdown-state]')?.textContent.startsWith('0 STEPS')"), "an empty Markdown source must leave only the locked zero-step shell");
  await evaluate(`import('/src/data/lessons/candidates/day-001.js').then(({ LESSON_MARKDOWN }) => {
    const input = document.querySelector('[data-lesson-markdown-input]');
    input.value = LESSON_MARKDOWN;
    input.dispatchEvent(new Event('input', { bubbles:true }));
  })`);
  await waitFor("document.querySelector('#lesson-content [data-live-authored-step] h1')?.textContent === 'How the web actually works' && document.querySelector('.lesson-top-title')?.getAttribute('aria-valuemax') === '19'", "restoring the Markdown restores the rendered lesson");
  await evaluate("document.querySelector('[data-close-lesson-markdown]').click()");
  await waitFor("document.querySelector('.lesson-markdown-source').hidden", "the Markdown source drawer closing");
  await captureScreenshot("day-1-ready-lesson.png");
  assert((await evaluate("location.search")) === "?day=1", "opening a lesson must create a restorable lesson URL"); const openedLessonFocus = await evaluate("document.activeElement?.id || document.activeElement?.className || document.activeElement?.tagName");
  assert(openedLessonFocus === "lesson-markdown-toggle", `closing the Markdown source must restore its trigger focus; found ${openedLessonFocus}`);
  await evaluate("document.querySelector('#lesson-content [data-template-primary]').click()");
  await waitFor("document.querySelector('#lesson-content [data-live-authored-step] h1')?.textContent === 'The web begins with two roles'", "the client and server explanation");
  await evaluate("document.querySelector('#lesson-content [data-template-primary]').click()");
  await waitFor("document.querySelectorAll('#lesson-content [data-ui-lab-answer]').length === 4", "Day 1 client and server check");
  assert(await evaluate("document.querySelector('#lesson-content h1')?.textContent === 'Follow the responsibility' && document.body.classList.contains('ui-lab-mcq-open')"), "the client and server check must reuse the approved question renderer");
  await captureScreenshot("day-1-ready-question.png");
  await evaluate(`(() => { const answer = document.querySelector('[data-ui-lab-answer="client-browser"]'); const check = document.querySelector('[data-ui-lab-check]'); answer.click(); check.click(); check.click(); })()`);
  await waitFor("document.querySelector('#lesson-content [data-live-authored-step] h1')?.textContent === 'A URL tells the browser what to reach'", "the URL anatomy explanation");
  assert(await evaluate("document.querySelectorAll('#lesson-content [data-live-authored-step] h1').length === 1"), "authored explanation headings must never duplicate");
  await evaluate("document.querySelector('#lesson-content [data-template-primary]').click()");
  await waitFor("document.querySelectorAll('#lesson-content [data-ui-lab-answer]').length === 4", "the origin boundary check");
  await evaluate(`(() => { const answer = document.querySelector('[data-ui-lab-answer="other-path"]'); const check = document.querySelector('[data-ui-lab-check]'); answer.click(); check.click(); check.click(); })()`);
  await waitFor("document.querySelector('#lesson-content [data-live-authored-step] h1')?.textContent === 'First build the whole chain'", "the first URL-to-pixels model");
  await evaluate("document.querySelector('#lesson-content [data-template-primary]').click()");
  await waitFor("document.querySelectorAll('#lesson-content [data-sequence-step]').length === 11", "the Day 1 URL-to-pixels ordering step");
  assert(await evaluate(`(() => { const choices = [...document.querySelectorAll('#lesson-content [data-sequence-step]')]; return choices.map((choice) => choice.dataset.sequenceStep).join(',') !== 'read-url,dns,tcp,tls,request,server-work,response,parse-html,discover,fetch-more,paint' && choices.map((choice) => choice.querySelector('span').textContent).join(',') === 'A,B,C,D,E,F,G,H,I,J,K'; })()`), "ordering choices must be scrambled and must not reveal their correct ranks");
  await evaluate(`(() => { ['read-url','dns','tcp','tls','request','server-work','response','parse-html','discover','fetch-more','paint'].forEach((id) => document.querySelector('[data-sequence-step="' + id + '"]').click()); const check = document.querySelector('[data-sequence-check]'); check.click(); check.click(); })()`);
  await waitFor("document.querySelector('#lesson-content [data-live-authored-step] h1')?.textContent === 'What each network stage contributes'", "the network responsibility explanation");
  await evaluate("document.querySelector('#lesson-content [data-template-primary]').click()");
  await waitFor("document.querySelector('#lesson-content [data-live-authored-step] h1')?.textContent === 'Requests and responses leave evidence'", "the detailed HTTP explanation");
  assert(await evaluate("document.querySelectorAll('#lesson-content pre').length === 2 && Boolean(document.querySelector('#lesson-content table'))"), "the HTTP explanation must render authored code and status evidence");
  await evaluate("document.querySelector('#lesson-content [data-template-primary]').click()");
  await waitFor("document.querySelectorAll('#lesson-content [data-ui-lab-answer]').length === 4", "the four-choice response evidence check");
  await evaluate(`(() => { const answer = document.querySelector('[data-ui-lab-answer="missing-json"]'); const check = document.querySelector('[data-ui-lab-check]'); answer.click(); check.click(); check.click(); })()`);
  await waitFor("document.querySelector('#lesson-content [data-live-authored-step] h1')?.textContent === 'The server can return stored or computed content'", "the static and dynamic explanation");
  await evaluate("document.querySelector('#lesson-content [data-template-primary]').click()");
  await waitFor("document.querySelectorAll('#lesson-content [data-ui-lab-answer]').length === 4", "the static and dynamic check");
  await evaluate(`(() => { const answer = document.querySelector('[data-ui-lab-answer="account-page"]'); const check = document.querySelector('[data-ui-lab-check]'); answer.click(); check.click(); check.click(); })()`);
  for (const heading of ['An HTML response is not yet pixels', 'The interview chain is a model, not a recording', 'Read with questions, not a highlighter', 'Build: DevTools archaeology']) {
    await waitFor(`document.querySelector('#lesson-content [data-live-authored-step] h1')?.textContent === ${JSON.stringify(heading)}`, heading);
    await evaluate("document.querySelector('#lesson-content [data-template-primary]').click()");
  }
  await waitFor("document.querySelectorAll('#lesson-content [data-ui-lab-answer]').length === 4", "the DevTools layer check");
  await evaluate(`(() => { const answer = document.querySelector('[data-ui-lab-answer="server-handling"]'); const check = document.querySelector('[data-ui-lab-check]'); answer.click(); check.click(); check.click(); })()`);
  await waitFor("Boolean(document.querySelector('#lesson-content #ui-lab-response'))", "the Explain It authored step");
  assert(await evaluate("document.querySelector('#lesson-content')?.textContent.includes('Write URL to pixels in twelve sentences')"), "Day 1 must use the authored written-response pattern for the final narration");

  const spotBugFixture = [
    ":::spot-bug", "id: browser-spot-bug", "title: Test the shared bug renderer", "question: Find the assignment bug.", "code:", "```javascript", "if (response.ok = false) console.log('failed');", "```", "line: 1", "reasons:", "- [x] assignment | Assignment is used instead of a test", "- [ ] timing | The timer is missing", "explanation: Use a real condition.", "hint: Inspect the operator.", ":::"
  ].join("\n");
  const codeFixture = [
    ":::code-question", "id: browser-code", "title: Test the shared code renderer", "instructions:", "Verify the authored editor contract.", "requirements:", "- Keep an h1.", "- Match the exact title.", "html:", "```html", "<h1>Profile loaded</h1>", "```", "checks:", "- html-selector | h1", "- file-contains | html | Profile loaded | case-sensitive", ":::"
  ].join("\n");
  const setDaySource = async (source) => evaluate(`(() => { const input = document.querySelector('[data-lesson-markdown-input]'); input.value = ${JSON.stringify(source)}; input.dispatchEvent(new Event('input', { bubbles:true })); })()`);
  await evaluate("document.querySelector('.lesson-markdown-toggle').click()");
  await setDaySource(spotBugFixture);
  await waitFor("Boolean(document.querySelector('#lesson-content [data-bug-line=\"1\"]'))", "the authored spot-the-bug renderer in Day 1");
  await setDaySource(codeFixture);
  await waitFor("Boolean(document.querySelector('#lesson-content .ds-practice-only .cm-editor'))", "the authored code editor in Day 1");
  await evaluate("document.querySelector('#lesson-content [data-run-code]').click()");
  await waitFor("document.querySelector('#lesson-content [data-template-action-label]')?.textContent === 'CONTINUE'", "the Day 1 declarative code checks");
  await evaluate(`import('/src/data/lessons/candidates/day-001.js').then(({ LESSON_MARKDOWN }) => { const input = document.querySelector('[data-lesson-markdown-input]'); input.value = LESSON_MARKDOWN; input.dispatchEvent(new Event('input', { bubbles:true })); })`);
  await waitFor("document.querySelector('#lesson-content [data-live-authored-step] h1')?.textContent === 'How the web actually works'", "the complete Day 1 source restoration");
  await evaluate("document.querySelector('[data-close-lesson-markdown]').click()");
  assert(await evaluate("!document.querySelector('.level[data-day=\"1\"]').classList.contains('is-complete')"), "editing the development source must not award lesson progress");
  await evaluate("history.back()"); await waitFor("!document.querySelector('.lesson-view').classList.contains('is-visible')", "browser Back to the course map");
  assert((await evaluate("location.search")) === "", "browser Back must restore the course URL");
  assert(await evaluate("!document.querySelector('#lesson-content').hasAttribute('aria-busy')"), "leaving a lesson must clear stale loading semantics");
  await navigate(`${appUrl}?day=37`);
  await waitFor("document.querySelector('.lesson-hero--coming-soon') && document.querySelector('#lesson-content').getAttribute('aria-busy') === 'false'", "direct day 37 route");
  await evaluate("document.querySelector('.lesson-back').click()");
  await waitFor("!document.querySelector('.lesson-view').classList.contains('is-visible')", "direct lesson close");
  assert(await evaluate("document.activeElement === document.querySelector('[data-day=\"37\"]')"), "closing a direct lesson route must focus its matching day, not Day 1");
  const samePageHistoryLength = await evaluate("history.length");
  await evaluate("document.querySelector('[data-page=\"learn\"]').click()");
  assert(await evaluate(`history.length === ${samePageHistoryLength}`), "selecting the current top-level page must not add a duplicate history entry");
  await evaluate("window.scrollTo(0, 500); document.querySelector('[data-page=\"shop\"]').click()");
  assert((await evaluate("location.search")) === "?page=shop", "top-level navigation must write its page URL");
  const shopHistoryLength = await evaluate("history.length");
  await evaluate("document.querySelector('[data-page=\"shop\"]').click()");
  assert(await evaluate(`history.length === ${shopHistoryLength}`), "reselecting Shop must not add a duplicate history entry");
  await evaluate("history.back()");
  await waitFor("document.querySelector('[data-page=\"learn\"]').getAttribute('aria-current') === 'page'", "browser Back to Learn");
  await waitFor("Math.abs(window.scrollY - 500) < 2", "course scroll restoration");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width:390, height:844, deviceScaleFactor:1, mobile:true }, sessionId);
  assert(await evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), "mobile course map has horizontal overflow");
  await evaluate("document.querySelector('.overview-trigger').click()");
  await waitFor("document.querySelector('.sidebar').classList.contains('is-open')", "mobile game overview");
  const dialog = await evaluate(`(() => ({
    role:document.querySelector('.sidebar').getAttribute('role'),
    modal:document.querySelector('.sidebar').getAttribute('aria-modal'),
    expanded:document.querySelector('.overview-trigger').getAttribute('aria-expanded'),
    focus:document.activeElement?.className,
    backgroundInert:document.querySelector('.column').inert,
  }))()`);
  assert(dialog.role === "dialog" && dialog.modal === "true", "mobile overview must expose modal dialog semantics");
  assert(dialog.expanded === "true", "overview trigger must expose expanded state");
  assert(dialog.focus === "modal-close", "opening the overview must move focus to its close control");
  assert(dialog.backgroundInert === true, "overview background must be inert while modal is open");
  assert(await evaluate(`(() => {
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key:'Tab', bubbles:true, cancelable:true }));
    return document.activeElement === document.querySelector('.modal-close');
  })()`), "mobile overview must contain forward Tab focus");
  await cdp.send("Input.dispatchKeyEvent", { type:"keyDown", key:"Escape", code:"Escape" }, sessionId);
  await cdp.send("Input.dispatchKeyEvent", { type:"keyUp", key:"Escape", code:"Escape" }, sessionId);
  await waitFor("!document.querySelector('.sidebar').classList.contains('is-open')", "overview close");
  assert(await evaluate("document.activeElement === document.querySelector('.overview-trigger')"), "closing the overview must restore trigger focus");
  assert(await evaluate("document.querySelector('.column').inert === false"), "closing the overview must restore background interaction");
  await evaluate("document.querySelector('[data-day=\"1\"]').click()");
  await waitFor("document.querySelector('.lesson-flow')", "mobile lesson route");
  const mobileDayOne = await evaluate(`(() => { const lesson = document.querySelector('.lesson-flow').getBoundingClientRect(); const stageElement = document.querySelector('[data-live-authored-step]'); const stage = stageElement.getBoundingClientRect(); const state = { innerWidth, lessonLeft:lesson.left, lessonRight:lesson.right, stageLeft:stage.left, stageRight:stage.right, documentWidth:document.documentElement.scrollWidth, fontSize:parseFloat(getComputedStyle(stageElement.querySelector('.markdown-rendered')).fontSize) }; state.ok = lesson.left >= 0 && lesson.right <= innerWidth && stage.left >= 0 && stage.right <= innerWidth && state.documentWidth <= innerWidth && state.fontSize >= 15; return state; })()`);
  assert(mobileDayOne.ok, `mobile Day 1 must keep readable text inside the viewport (${JSON.stringify(mobileDayOne)})`);
  await evaluate("document.querySelector('.overview-trigger').click()");
  await waitFor("document.querySelector('.sidebar').classList.contains('is-open')", "overview opened from a lesson");
  assert(await evaluate("getComputedStyle(document.querySelector('.sidebar')).display !== 'none' && document.activeElement === document.querySelector('.modal-close')"), "overview opened from a lesson must be visible and retain focus");
  assert(await evaluate("document.querySelector('.lesson-view').inert"), "lesson content must be inert behind the overview");
  await cdp.send("Input.dispatchKeyEvent", { type:"keyDown", key:"Escape", code:"Escape" }, sessionId);
  await cdp.send("Input.dispatchKeyEvent", { type:"keyUp", key:"Escape", code:"Escape" }, sessionId);
  await waitFor("!document.querySelector('.sidebar').classList.contains('is-open')", "lesson overview close");
  await evaluate("document.querySelector('.lesson-back').click()");
  await waitFor("!document.querySelector('.lesson-view').classList.contains('is-visible')", "mobile lesson close");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width:1280, height:900, deviceScaleFactor:1, mobile:false }, sessionId);
  simulateStaticDocument = true;
  await navigate(`${appUrl}?page=more&static=1`);
  await waitFor("document.querySelectorAll('.level[data-day]').length === 112", "the raw-static More page");
  const staticReference = await evaluate(`(() => ({
    tabs:document.querySelectorAll('[data-more-tab]').length,
    resources:performance.getEntriesByType('resource').map(({ name }) => name),
  }))()`);
  assert(staticReference.tabs === 3, "raw-static More must expose all three empty tool tabs");
  assert(!staticReference.resources.some((url) => url.includes("/src/styles/design-system") || url.includes("/src/ui/design-system-view.js")), "raw-static output must not load Design System resources");
  simulateStaticDocument = false;

  await cdp.send("Emulation.setDeviceMetricsOverride", { width:1280, height:900, deviceScaleFactor:1, mobile:false }, sessionId);
  await navigate(`${appUrl}?page=more`);
  await waitFor("document.querySelector('.more-tabs:not([hidden]) [data-more-tab=\"design-system\"]')", "tool tabs in More");
  assert(await evaluate("document.querySelectorAll('.more-tab-panel').length === 3 && Boolean(document.querySelector('#ui-lab-panel [data-open-markdown-system]')) && !document.querySelector('#ship-ready-panel').textContent.trim()"), "UI Lab must expose the lesson authoring system while Ship Ready remains lazy");
  await evaluate("document.querySelector('[data-more-tab=\"ui-lab\"]').click()");
  assert(await evaluate("location.search === '?page=more' && Boolean(document.querySelector('#ui-lab-panel [data-open-markdown-system]'))"), "UI Lab must retain the restored lesson authoring entry");
  await evaluate("document.querySelector('[data-open-markdown-system]').click()");
  await waitFor("location.search === '?view=ship-ready-markdown' && Boolean(document.querySelector('[data-markdown-input]'))", "the restored UI Lab lesson authoring workspace");
  await evaluate("document.querySelector('.lesson-back').click()");
  await waitFor("location.search === '?page=more' && Boolean(document.querySelector('#ui-lab-panel [data-open-markdown-system]'))", "return from the UI Lab authoring workspace");
  await verifyShipReadyTemplates({ assert, captureScreenshot, cdp, delay, evaluate, sessionId, waitFor });
  await evaluate("document.querySelector('[data-more-tab=\"design-system\"]').click()");
  await waitFor("document.querySelector('.ds-hero')", "restored Design System gallery");
  const restoredDesignSystem = await evaluate(`(() => ({
    route:location.search,
    title:document.querySelector('.ds-hero h1')?.textContent,
    sections:document.querySelectorAll('.ds-section').length,
    hasCodeLab:Boolean(document.querySelector('[data-code-lab]')),
    resources:performance.getEntriesByType('resource').map(({ name }) => name),
  }))()`);
  assert(restoredDesignSystem.route === "?view=design-system", "opening the More entry must use the canonical Design System route");
  assert(restoredDesignSystem.title === "Full-Stack Quest Design System" && restoredDesignSystem.sections >= 6, "the expandable Design System must render its complete reference sections");
  assert(restoredDesignSystem.hasCodeLab, "the restored Design System must retain its interactive code lab");
  assert(restoredDesignSystem.resources.some((url) => url.includes("/src/styles/design-system.css")), "the restored Design System must load its modular stylesheet");
  assert(await evaluate("document.querySelectorAll('[data-markdown-feature]').length >= 10"), "the restored Design System must retain its Markdown-style lesson reference");
  assert(await evaluate("Boolean(document.querySelector('.ds-section-toggle[aria-expanded]'))"), "the restored Design System must retain expandable sections");
  await evaluate("document.querySelector('.lesson-back').click()");
  await waitFor("location.search === '?page=more'", "return from Design System to More");
  assert(await evaluate("document.activeElement === document.querySelector('[data-more-tab=\"design-system\"]')"), "closing the Design System must restore focus to its More tab");

  assert(browserErrors.length === 0, `browser reported errors: ${browserErrors.join(" | ")}`);
  assert(failedLocalRequests.length === 0, `browser requests failed: ${failedLocalRequests.join(" | ")}`);
  if (allowExternalAssets) assert(failedExternalRequests.length === 0, `external browser resources failed: ${failedExternalRequests.join(" | ")}`);
  assert(serverErrors.filter(Boolean).length === 0, `development server reported errors: ${serverErrors.filter(Boolean).join(" | ")}`);

  if (failures.length) {
    console.error(`Browser smoke tests failed:\n- ${failures.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log("Browser smoke tests passed: route state, hidden development reference boundaries, lesson focus, modal containment, Design System return focus, responsive behavior, reduced motion, and server recovery.");
  }

  await cdp.send("Browser.close");
} catch (error) {
  if (error instanceof ScreenshotCaptureComplete) console.log(`Captured focused screenshot: ${error.filename}`);
  else throw error;
} finally {
  await terminateProcess(chromeProcess);
  await terminateProcess(serverProcess);
  if (profileDirectory) await rm(profileDirectory, { recursive:true, force:true, maxRetries:5, retryDelay:100 });
}
