import assert from "node:assert/strict";
import test from "node:test";
import { parseLessonMarkdown } from "../src/markdown/lesson-authoring.js";
import { compileLessonMarkdown, defineMarkdownLesson } from "../src/markdown/lesson-model.js";
import { LESSON_MARKDOWN as DAY_ONE_MARKDOWN } from "../src/data/lessons/candidates/day-001.js";

test("parses Markdown and existing interactive patterns into ordered steps", () => {
  const source = `# Request flow

Normal **Markdown** stays normal.

:::mcq
title: Status
question: Which one is missing?
- [ ] ok | 200
- [x] missing | 404
explanation: Correct status.
:::

:::true-false
title: Fragment
question: A fragment reaches the server.
answer: false
:::

:::sequence
title: Order
question: Put these in order.
- [2] response | Response
- [1] request | Request
:::`;
  const result = parseLessonMarkdown(source);
  assert.deepEqual(result.steps.map((step) => step.type), ["markdown", "mcq", "mcq", "sequence"]);
  assert.deepEqual(result.steps[1].content.answers.map(({ id, correct }) => ({ id, correct })), [
    { id:"ok", correct:false }, { id:"missing", correct:true },
  ]);
  assert.equal(result.steps[2].content.answers.find((answer) => answer.correct).id, "false");
  assert.deepEqual(result.steps[3].content.expected, ["request", "response"]);
  assert.deepEqual(result.issues, []);
});

test("parses named fill blanks without exposing layout markup", () => {
  const source = `:::fill-blanks
title: Fetch
question: Complete it.
code:
\`\`\`javascript
fetch([[endpoint]], { method: [[method]] });
\`\`\`
answers:
- endpoint | "/api/users"
- method | "GET"
options:
- \`"POST"\`
- \`"/api/users"\`
- \`"GET"\`
:::`;
  const result = parseLessonMarkdown(source);
  assert.deepEqual(result.steps[0].content.blanks, ["endpoint", "method"]);
  assert.deepEqual(result.steps[0].content.expected, ['"/api/users"', '"GET"']);
  assert.deepEqual(result.steps[0].content.fragments, ["fetch(", ", { method: ", " });"]);
  assert.deepEqual(result.issues, []);
});

test("parses spot-the-bug reasons and reports invalid authoring", () => {
  const valid = parseLessonMarkdown(`:::spot-bug
title: Bug
question: Find it.
code:
\`\`\`javascript
const value = call(;
console.log(value);
\`\`\`
line: 1
reasons:
- [x] parenthesis | Missing parenthesis
- [ ] variable | Wrong variable
:::`);
  assert.equal(valid.steps[0].content.correctLine, 1);
  assert.equal(valid.steps[0].content.correctReason, "parenthesis");
  assert.deepEqual(valid.issues, []);

  const invalid = parseLessonMarkdown(":::mcq\ntitle: Broken\n- [ ] One\n:::");
  assert.ok(invalid.issues.some((issue) => issue.includes("at least two")));
  assert.ok(invalid.issues.some((issue) => issue.includes("exactly one")));
});

test("parses code questions into the existing editor contract with case-sensitive checks", () => {
  const result = parseLessonMarkdown(`:::code-question
title: Explorer card
instructions:
Update the starter files.
requirements:
- Keep a heading.
- Match the exact name.
- Add a background.
html:
\`\`\`html
<h1>Mira</h1>
\`\`\`
css:
\`\`\`css
h1 { color: white; }
\`\`\`
js:
\`\`\`javascript
console.log("ready");
\`\`\`
checks:
- html-selector | h1
- file-contains | html | Mira the Explorer | case-sensitive
- css-property | background, background-color
:::`);

  assert.equal(result.steps[0].type, "code-question");
  assert.equal(result.steps[0].content.files.html, "<h1>Mira</h1>");
  assert.match(result.steps[0].content.instructions, /- \[ \] Match the exact name\./);
  assert.deepEqual(result.steps[0].content.checks[1], {
    type:"file-contains", file:"html", value:"Mira the Explorer", caseSensitive:true,
  });
  assert.deepEqual(result.issues, []);
});

test("compiles stable Markdown and practice MCQ ids into the published lesson model", () => {
  const source = `<!-- step-id: request-lesson -->
# Requests

The browser sends a request.

:::mcq
id: request-check
title: Check requests
question: Who sends the request?
- [x] browser | The browser
- [ ] server | The server
explanation: Correct.
hint: The client starts it.
:::`;
  const compiled = compileLessonMarkdown(source);
  assert.deepEqual(compiled.steps.map((step) => step.id), ["request-lesson", "request-check"]);
  assert.equal(compiled.steps[0].blocks[0].type, "markdown");
  assert.doesNotMatch(compiled.steps[0].blocks[0].source, /^# Requests/m);
  assert.doesNotMatch(compiled.steps[0].blocks[0].source, /step-id/);
  assert.equal(compiled.steps[1].question.phase, "practice");
  assert.equal(compiled.steps[1].question.critical, false);
  assert.deepEqual(compiled.issues, []);
  const lesson = defineMarkdownLesson({ title:"Requests", summary:"Follow a request." }, source, { day:1 });
  assert.equal(lesson.authoringSource, source);
  assert.equal(Object.isFrozen(lesson), true);
});

test("rejects unsupported directives, fields, raw HTML, and noncanonical true-false choices", () => {
  const parsed = parseLessonMarkdown(`# Unsafe authoring

<div class="custom-card">Do not author lesson UI.</div>

:::matching
title: Invented component
:::

:::mcq
title: Ignored checkpoint
question: Which answer is correct?
phase: checkpoint
- [x] yes | Yes
- [ ] no | No
:::

:::true-false
title: Duplicate syntax
question: Use the canonical answer field.
- [x] true | True
- [ ] false | False
:::`);
  assert.ok(parsed.issues.some((issue) => issue.includes("must not contain raw HTML")));
  assert.ok(parsed.issues.some((issue) => issue.includes("Unsupported lesson directive :::matching")));
  assert.ok(parsed.issues.some((issue) => issue.includes("unsupported field “phase”")));
  assert.ok(parsed.issues.some((issue) => issue.includes("must use answer: true")));
});

test("rejects raw or nested directive content and malformed content callouts", () => {
  const parsed = parseLessonMarkdown(`:::note Unclosed callout
Keep reading.

:::mcq
title: Nested source
question: Which one?
- [x] yes | <span>Yes</span>
- [ ] no | No
:::tip Nested callout
Inside a question.
:::
:::`);
  assert.ok(parsed.issues.some((issue) => issue.includes("missing its closing")));
  assert.ok(parsed.issues.some((issue) => issue.includes("must not contain raw HTML")));
  assert.ok(parsed.issues.some((issue) => issue.includes("must not contain a nested lesson directive")));
});

test("requires stable ids and complete fields when defining a published lesson", () => {
  const source = `# Requests

The browser asks for a resource.

:::mcq
title: Check requests
question: Who starts the request?
- [x] browser | Browser
- [ ] server | Server
explanation: The browser client starts it.
:::`;
  assert.throws(
    () => defineMarkdownLesson({ title:"Requests", summary:"Follow a request." }, source, { day:1 }),
    /Published explanation step 1 needs.*Published step 2 \(mcq\) needs a non-empty id.*Published step 2 \(mcq\) needs a non-empty hint/s,
  );
  assert.doesNotThrow(() => defineMarkdownLesson({ status:"candidate", title:"Requests", summary:"Follow a request." }, source, { day:1 }));
});

test("validates authored response limits against the review server contract", () => {
  const parsed = parseLessonMarkdown(`:::response
title: ${"T".repeat(161)}
question: Explain it.
rubric:
${Array.from({ length:9 }, (_, index) => `- Criterion ${index + 1}`).join("\n")}
max-length: 50
:::`);
  assert.ok(parsed.issues.some((issue) => issue.includes("title can contain at most 160")));
  assert.ok(parsed.issues.some((issue) => issue.includes("at most eight items")));
  assert.ok(parsed.issues.some((issue) => issue.includes("80 to 2000")));
});

test("rejects impossible fill options and duplicate interactive item ids", () => {
  const fill = parseLessonMarkdown(`:::fill-blanks
title: Repeated value
question: Fill both values.
code:
\`\`\`javascript
const pair = [[[first]], [[second]]];
\`\`\`
answers:
- first | "same"
- second | "same"
options:
- \`"same"\`
- \`"other"\`
:::`);
  assert.ok(fill.issues.some((issue) => issue.includes("including duplicates used more than once")));

  const sequence = parseLessonMarkdown(`:::sequence
title: Duplicate ids
question: Order these.
- [1] same | First
- [2] same | Second
:::`);
  assert.ok(sequence.issues.some((issue) => issue.includes("item ids must be unique")));

  const bug = parseLessonMarkdown(`:::spot-bug
title: Duplicate reasons
question: Find the bug.
code:
\`\`\`javascript
call(;
\`\`\`
line: 1
reasons:
- [x] same | Missing parenthesis
- [ ] same | Wrong name
:::`);
  assert.ok(bug.issues.some((issue) => issue.includes("reason ids must be unique")));
});

test("plain URL answer choices are displayed as non-navigating code", () => {
  const parsed = parseLessonMarkdown(`:::mcq
title: Origins
question: Which URL matches?
- [x] same | https://example.com:443/settings
- [ ] other | https://example.com:8443/settings
:::`);
  assert.deepEqual(parsed.steps[0].content.answers.map((answer) => answer.text), [
    "`https://example.com:443/settings`",
    "`https://example.com:8443/settings`",
  ]);
});

test("Day 1 is a focused URL-to-pixels lesson", () => {
  const parsed = parseLessonMarkdown(DAY_ONE_MARKDOWN);
  const types = parsed.steps.map((step) => step.type);
  assert.equal(DAY_ONE_MARKDOWN.length > 20_000, true);
  assert.equal(parsed.steps.length, 19);
  assert.deepEqual(parsed.issues, []);
  ["markdown", "mcq", "sequence", "response"].forEach((type) => {
    assert.equal(types.includes(type), true, `Day 1 must include ${type}`);
  });
  ["fill-blanks", "spot-bug", "code-question"].forEach((type) => {
    assert.equal(types.includes(type), false, `Day 1 must not force an unrelated ${type} interaction`);
  });
  assert.deepEqual(parsed.steps.filter((step) => step.type === "sequence").map((step) => step.id), ["url-to-pixels-order"]);
  assert.deepEqual(parsed.steps.filter((step) => step.type === "response").map((step) => step.id), ["twelve-sentence-narration"]);
  ["client-server-conversation", "url-anatomy", "connection-and-security", "http-evidence", "static-and-dynamic", "browser-builds-the-page", "useful-simplifications", "guided-reading", "devtools-archaeology", "day-one-finish-line"].forEach((id) => {
    assert.equal(parsed.steps.some((step) => step.id === id), true, `Day 1 must preserve the ${id} explanation`);
  });
  const fourChoiceChecks = parsed.steps.filter((step) => step.type === "mcq" && step.content.answers.length !== 2);
  assert.equal(fourChoiceChecks.every((step) => step.content.answers.length === 4), true);
  assert.equal(new Set(parsed.steps.map((step) => step.id)).size, parsed.steps.length);
  const compiled = compileLessonMarkdown(DAY_ONE_MARKDOWN);
  assert.equal(compiled.steps.length, parsed.steps.length);
  assert.deepEqual(compiled.issues, []);
});
