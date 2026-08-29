import { defineLesson } from "../domain/lesson.js";
import { parseLessonMarkdown } from "./lesson-authoring.js";

function explanationBody(source) {
  const lines = String(source).split("\n");
  while (lines[0]?.trim() === "") lines.shift();
  if (/^<!--\s*step-id:/i.test(lines[0]?.trim() || "")) lines.shift();
  while (lines[0]?.trim() === "") lines.shift();
  if (/^#\s+/.test(lines[0] || "")) lines.shift();
  while (lines[0]?.trim() === "") lines.shift();
  return lines.join("\n").trim();
}

function compileMarkdownStep(step, issues) {
  if (step.type === "markdown") {
    return {
      id:step.id,
      type:"explanation",
      tag:"LEARN",
      title:step.title,
      blocks:[{ type:"markdown", source:explanationBody(step.source) }],
    };
  }
  if (step.type === "mcq") {
    const correct = step.content.answers.find((answer) => answer.correct);
    return {
      id:step.id,
      type:"question",
      tag:step.content.phase === "checkpoint" ? "FINAL CHECKPOINT" : "CHECK",
      title:step.content.title,
      question:{
        phase:step.content.phase,
        critical:step.content.critical,
        prompt:step.content.prompt,
        correctChoiceId:correct?.id || "",
        choices:step.content.answers.map((answer) => ({
          id:answer.id,
          label:answer.text,
          feedback:answer.correct ? step.content.correctFeedback : step.content.wrongFeedback,
        })),
      },
    };
  }
  return {
    id:step.id,
    type:"activity",
    tag:"PRACTICE",
    title:step.content?.title || "Interactive practice",
    blocks:[{ type:"paragraph", text:`Interactive ${step.type} step authored in Markdown.` }],
  };
}

export function compileLessonMarkdown(source, options) {
  const parsed = parseLessonMarkdown(source, options);
  const issues = [...parsed.issues];
  const steps = parsed.steps.map((step) => compileMarkdownStep(step, issues)).filter(Boolean);
  return { steps, issues, parsed };
}

export function defineMarkdownLesson(candidate, source, options) {
  const compiled = compileLessonMarkdown(source, { published:(candidate?.status ?? "published") === "published" });
  if (compiled.issues.length) throw new TypeError(`Invalid lesson Markdown: ${compiled.issues.join("; ")}`);
  return defineLesson({ ...candidate, authoringSource:String(source), steps:compiled.steps }, options);
}
