import assert from "node:assert/strict";
import test from "node:test";
import { SHIP_READY_ROUTES, SHIP_READY_TEMPLATES, getShipReadyTemplate, isShipReadyRoute } from "../src/data/ship-ready.js";
import { renderTemplateFooter, renderTemplateShell } from "../src/ui/template-shell.js";
import { createCodePreviewDocument } from "../src/ui/code-preview.js";
import { renderShipReadyContent } from "../src/ui/ship-ready-level.js";

test("Ship Ready catalog is the single unique route and content registry", () => {
  assert.equal(SHIP_READY_TEMPLATES.length, 8);
  assert.equal(new Set(SHIP_READY_ROUTES).size, SHIP_READY_TEMPLATES.length);
  SHIP_READY_TEMPLATES.forEach((template) => {
    assert.equal(getShipReadyTemplate(template.route), template);
    assert.equal(isShipReadyRoute(template.route), true);
    assert.equal(Object.isFrozen(template), true);
    if (template.content) assert.equal(Object.isFrozen(template.content), true);
    assert.ok(template.label && template.title && template.chromeTitle && template.preview);
    if (template.renderer === "level" || template.renderer === "code") assert.ok(template.content);
  });
  const codeTemplate = getShipReadyTemplate("ship-ready-code-lab");
  assert.deepEqual(Object.keys(codeTemplate.content.files), ["html", "css", "js"]);
  assert.equal(Object.isFrozen(codeTemplate.content.files), true);
  assert.equal(Object.isFrozen(codeTemplate.content.checks), true);
  assert.equal(getShipReadyTemplate("ui-lab"), null);
  assert.equal(isShipReadyRoute("ui-lab"), false);
});

test("the template shell escapes text and attribute values while preserving explicit trailing markup", () => {
  const footer = renderTemplateFooter({
    backLabel:'Back < "home"',
    feedback:"Use <main> & continue",
    primaryLabel:"Check >",
    primaryAttributes:{ title:'A "quoted" value' },
    primaryTrailingContent:'<span class="trusted-icon"></span>',
  });
  assert.match(footer, /Back &lt; &quot;home&quot;/);
  assert.match(footer, /Use &lt;main&gt; &amp; continue/);
  assert.match(footer, /title="A &quot;quoted&quot; value"/);
  assert.match(footer, /class="trusted-icon"/);
  assert.throws(() => renderTemplateFooter({ primaryAttributes:{ "bad name":"value" } }), /Invalid HTML attribute name/);
});

test("code preview documents safely contain editor source and identify each run", () => {
  const document = createCodePreviewDocument({
    html:"<main>Preview</main>",
    css:"main::after { content: '</style>'; }",
    js:"console.log('</script>')",
    runId:7,
  });
  assert.match(document, /<\\\/style>/);
  assert.match(document, /<\\\/script>/);
  assert.match(document, /runId=7/);
  assert.match(document, /full-stack-quest-code-lab/);
});

test("the shared template shell owns the approved footer and scroll affordance", () => {
  const footer = renderTemplateFooter({ primaryLabel:"CHECK", primaryAttributes:{ disabled:true, "data-check":true } });
  const shell = renderTemplateShell({ content:'<h1 id="ui-lab-content-title">Example</h1>', footer });
  assert.match(shell, /class="level-layout-preview"/);
  assert.match(shell, /class="level-layout-actions"/);
  assert.match(shell, /data-template-back/);
  assert.match(shell, /data-content-scroll/);
  assert.match(shell, /data-check/);
  assert.match(shell, / disabled/);
  assert.equal((shell.match(/level-layout-actions/g) || []).length, 1);
});

test("ordering choices never reveal or arrive in their correct sequence", () => {
  const html = renderShipReadyContent("sequence", {
    kicker:"ORDER", title:"Order the steps", prompt:"Choose the correct sequence.", mascot:"Think it through.",
    placeholder:"Choose a step", expected:["first", "second", "third"],
    steps:[
      { id:"first", text:"First step" },
      { id:"second", text:"Second step" },
      { id:"third", text:"Third step" },
    ],
  });
  assert.ok(html.indexOf('data-sequence-step="second"') < html.indexOf('data-sequence-step="first"'));
  assert.match(html, /<span>A<\/span>/);
  assert.match(html, /<span>B<\/span>/);
  assert.match(html, /<span>C<\/span>/);
  assert.doesNotMatch(html, /<span>0[123]<\/span>/);
});
