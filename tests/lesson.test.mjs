import assert from "node:assert/strict";
import test from "node:test";
import { defineLesson, LessonValidationError, validateLesson } from "../src/domain/lesson.js";
import { createLessonLoader } from "../src/data/lessons/load-lessons.js";

function validLesson() {
  return {
    title:"HTML structure",
    summary:"Build a meaningful document outline.",
    reward:30,
    steps:[
      { id:"document-outline", type:"explanation", title:"Create the outline", body:"Start with landmarks and one page heading." },
      { id:"semantic-elements", type:"example", title:"Use semantic elements", body:"Choose elements for their meaning.", code:"<main></main>", language:"html" },
    ],
  };
}

test("defineLesson returns a validated, immutable lesson", () => {
  const lesson = defineLesson(validLesson(), { day:1 });
  assert.equal(lesson.steps.length, 2);
  assert.equal(Object.isFrozen(lesson), true);
  assert.equal(Object.isFrozen(lesson.steps), true);
  assert.equal(Object.isFrozen(lesson.steps[0]), true);
  assert.equal(lesson.passingScore, 80);
});

test("lesson validation rejects unstable and duplicate step ids", () => {
  const candidate = validLesson();
  candidate.steps[0].id = "Document Outline";
  candidate.steps[1].id = "Document Outline";
  const result = validateLesson(candidate);
  assert.equal(result.ok, false);
  assert.match(result.issues.join(" "), /kebab-case/);
  assert.match(result.issues.join(" "), /unique/);
  assert.throws(() => defineLesson(candidate, { day:2 }), LessonValidationError);
});

test("lesson validation rejects unsupported step contracts and unsafe rewards", () => {
  const candidate = validLesson();
  candidate.reward = -1;
  candidate.steps[0].type = "multiple-choice";
  const result = validateLesson(candidate);
  assert.equal(result.ok, false);
  assert.match(result.issues.join(" "), /not supported/);
  assert.match(result.issues.join(" "), /between 0 and 10000/);
});

test("lesson validation accepts configurable passing scores and rejects invalid values", () => {
  const candidate = validLesson();
  candidate.passingScore = 70;
  assert.equal(defineLesson(candidate).passingScore, 70);
  candidate.passingScore = 0;
  const result = validateLesson(candidate);
  assert.equal(result.ok, false);
  assert.match(result.issues.join(" "), /passingScore/);
});

test("lesson loader deduplicates concurrent imports", async () => {
  let imports = 0;
  const registry = new Map([[1, async () => {
    imports += 1;
    return { default:validLesson() };
  }]]);
  const loadLesson = createLessonLoader({ registry, totalDays:1 });
  const [first, second] = await Promise.all([loadLesson(1), loadLesson(1)]);
  assert.equal(imports, 1);
  assert.strictEqual(first, second);
});

test("lesson loader clears a failed import so retry can recover", async () => {
  let imports = 0;
  const registry = new Map([[1, async () => {
    imports += 1;
    if (imports === 1) throw new Error("temporary failure");
    return { default:validLesson() };
  }]]);
  const loadLesson = createLessonLoader({ registry, totalDays:1 });
  await assert.rejects(loadLesson(1), /temporary failure/);
  assert.equal((await loadLesson(1)).title, "HTML structure");
  assert.equal(imports, 2);
});

test("lesson validation accepts immutable semantic content blocks for a candidate", () => {
  const lesson = defineLesson({
    status:"candidate",
    title:"How the web works",
    summary:"Trace a request and response.",
    outcome:"Explain URL to pixels.",
    steps:[{
      id:"request-sequence",
      type:"explanation",
      title:"Follow the request",
      blocks:[
        { type:"paragraph", text:"The client sends a request." },
        { type:"markdown", source:":::tip Shared renderer\nUse [[term: API | A software contract.]] in lessons.\n:::" },
        { type:"list", ordered:true, items:["Resolve DNS.", "Send HTTP."] },
        { type:"table", caption:"Sequence", columns:["Step", "Evidence"], rows:[["DNS", "IP address"]] },
      ],
    }],
  });
  assert.equal(lesson.status, "candidate");
  assert.equal(lesson.steps[0].body, undefined);
  assert.equal(Object.isFrozen(lesson.steps[0].blocks), true);
  assert.equal(Object.isFrozen(lesson.steps[0].blocks[2].items), true);
  assert.equal(lesson.steps[0].blocks[1].type, "markdown");
});

test("lesson validation accepts immutable practice and checkpoint questions", () => {
  const lesson = defineLesson({
    status:"candidate",
    title:"Question lesson",
    summary:"Teach, check, then decide passage.",
    steps:[{
      id:"origin-check",
      type:"question",
      title:"Define origin",
      question:{
        phase:"checkpoint",
        prompt:"Which parts define an origin?",
        correctChoiceId:"correct",
        critical:true,
        choices:[
          { id:"correct", label:"Scheme, host, and port", feedback:"Correct." },
          { id:"wrong", label:"Path and query", feedback:"Path and query do not define an origin." },
        ],
      },
    }],
  });
  assert.equal(lesson.steps[0].question.phase, "checkpoint");
  assert.equal(lesson.steps[0].question.critical, true);
  assert.equal(Object.isFrozen(lesson.steps[0].question.choices), true);
});

test("lesson validation rejects invalid question answer contracts", () => {
  const result = validateLesson({
    title:"Broken question",
    summary:"The correct answer is missing.",
    steps:[{
      id:"broken-check",
      type:"question",
      title:"Broken",
      question:{
        phase:"surprise",
        prompt:"Choose.",
        correctChoiceId:"missing",
        choices:[
          { id:"same", label:"One", feedback:"No." },
          { id:"same", label:"Two", feedback:"No." },
        ],
      },
    }],
  });
  assert.equal(result.ok, false);
  assert.match(result.issues.join(" "), /phase/);
  assert.match(result.issues.join(" "), /choice ids must be unique/);
  assert.match(result.issues.join(" "), /must match a choice id/);
});

test("lesson validation rejects unsafe resource URLs and malformed video ids", () => {
  const candidate = validLesson();
  candidate.steps[0].body = undefined;
  candidate.steps[0].blocks = [
    { type:"resources", items:[{ label:"Bad link", description:"Unsafe.", href:"javascript:alert(1)" }] },
    {
      type:"video",
      videoId:"short",
      title:"Video",
      creator:"Creator",
      duration:"1:00",
      purpose:"Purpose.",
      watchFor:"Sequence.",
      caveat:"None.",
      prompt:"Recall it.",
      watchUrl:"http://example.com/video",
    },
  ];
  const result = validateLesson(candidate);
  assert.equal(result.ok, false);
  assert.match(result.issues.join(" "), /absolute HTTPS URL/);
  assert.match(result.issues.join(" "), /11-character YouTube video id/);
  assert.match(result.issues.join(" "), /matching youtube.com watch URL/);
});
