const LESSON_STATUSES = new Set(["candidate", "published"]);
const LESSON_STEP_TYPES = new Set(["explanation", "example", "activity", "recap", "question"]);
const QUESTION_PHASES = new Set(["practice", "checkpoint"]);
const CONTENT_BLOCK_TYPES = new Set([
  "definitions",
  "list",
  "markdown",
  "note",
  "paragraph",
  "quote",
  "resources",
  "subheading",
  "table",
  "video",
]);
const STEP_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LANGUAGE_PATTERN = /^[a-z0-9-]+$/;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export class LessonValidationError extends Error {
  constructor(day, issues) {
    const lessonLabel = Number.isInteger(day) ? `day ${day}` : "lesson";
    super(`Invalid ${lessonLabel}: ${issues.join("; ")}`);
    this.name = "LessonValidationError";
    this.issues = issues;
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readRequiredText(source, key, path, issues) {
  const value = source[key];
  if (typeof value !== "string" || !value.trim()) {
    issues.push(`${path}.${key} must be a non-empty string`);
    return "";
  }
  return value.trim();
}

function readOptionalText(source, key, path, issues) {
  const value = source[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    issues.push(`${path}.${key} must be a non-empty string when provided`);
    return undefined;
  }
  return value.trim();
}

function readTextArray(source, key, path, issues, { minimum = 1 } = {}) {
  const value = source[key];
  if (!Array.isArray(value) || value.length < minimum || value.some((item) => typeof item !== "string" || !item.trim())) {
    issues.push(`${path}.${key} must be an array of at least ${minimum} non-empty string${minimum === 1 ? "" : "s"}`);
    return Object.freeze([]);
  }
  return Object.freeze(value.map((item) => item.trim()));
}

function readHttpsUrl(source, key, path, issues) {
  const value = readRequiredText(source, key, path, issues);
  try {
    if (new URL(value).protocol !== "https:") throw new Error("unsupported protocol");
  } catch {
    issues.push(`${path}.${key} must be an absolute HTTPS URL`);
  }
  return value;
}

function validateContentBlock(block, blockIndex, stepPath, issues) {
  const path = `${stepPath}.blocks[${blockIndex}]`;
  if (!isRecord(block)) {
    issues.push(`${path} must be an object`);
    return null;
  }

  const type = readRequiredText(block, "type", path, issues);
  if (!CONTENT_BLOCK_TYPES.has(type)) issues.push(`${path}.type "${type}" is not supported`);

  if (["paragraph", "subheading"].includes(type)) {
    return Object.freeze({ type, text:readRequiredText(block, "text", path, issues) });
  }

  if (type === "markdown") {
    return Object.freeze({ type, source:readRequiredText(block, "source", path, issues) });
  }

  if (["note", "quote"].includes(type)) {
    return Object.freeze({
      type,
      label:readRequiredText(block, "label", path, issues),
      text:readRequiredText(block, "text", path, issues),
    });
  }

  if (type === "list") {
    return Object.freeze({
      type,
      ordered:Boolean(block.ordered),
      items:readTextArray(block, "items", path, issues),
    });
  }

  if (type === "definitions") {
    if (!Array.isArray(block.items) || block.items.length === 0) issues.push(`${path}.items must be a non-empty array`);
    const items = Array.isArray(block.items) ? block.items.map((item, itemIndex) => {
      const itemPath = `${path}.items[${itemIndex}]`;
      if (!isRecord(item)) {
        issues.push(`${itemPath} must be an object`);
        return null;
      }
      return Object.freeze({
        term:readRequiredText(item, "term", itemPath, issues),
        definition:readRequiredText(item, "definition", itemPath, issues),
      });
    }).filter(Boolean) : [];
    return Object.freeze({ type, items:Object.freeze(items) });
  }

  if (type === "table") {
    const columns = readTextArray(block, "columns", path, issues, { minimum:2 });
    if (!Array.isArray(block.rows) || block.rows.length === 0) issues.push(`${path}.rows must be a non-empty array`);
    const rows = Array.isArray(block.rows) ? block.rows.map((row, rowIndex) => {
      if (!Array.isArray(row) || row.length !== columns.length || row.some((cell) => typeof cell !== "string" || !cell.trim())) {
        issues.push(`${path}.rows[${rowIndex}] must contain ${columns.length} non-empty string cells`);
        return null;
      }
      return Object.freeze(row.map((cell) => cell.trim()));
    }).filter(Boolean) : [];
    return Object.freeze({
      type,
      caption:readRequiredText(block, "caption", path, issues),
      columns,
      rows:Object.freeze(rows),
    });
  }

  if (type === "resources") {
    if (!Array.isArray(block.items) || block.items.length === 0) issues.push(`${path}.items must be a non-empty array`);
    const items = Array.isArray(block.items) ? block.items.map((item, itemIndex) => {
      const itemPath = `${path}.items[${itemIndex}]`;
      if (!isRecord(item)) {
        issues.push(`${itemPath} must be an object`);
        return null;
      }
      return Object.freeze({
        label:readRequiredText(item, "label", itemPath, issues),
        description:readRequiredText(item, "description", itemPath, issues),
        href:readHttpsUrl(item, "href", itemPath, issues),
      });
    }).filter(Boolean) : [];
    return Object.freeze({ type, items:Object.freeze(items) });
  }

  if (type === "video") {
    const videoId = readRequiredText(block, "videoId", path, issues);
    if (videoId && !VIDEO_ID_PATTERN.test(videoId)) issues.push(`${path}.videoId must be an 11-character YouTube video id`);
    const watchUrl = readHttpsUrl(block, "watchUrl", path, issues);
    try {
      const parsedWatchUrl = new URL(watchUrl);
      if (!["youtube.com", "www.youtube.com"].includes(parsedWatchUrl.hostname) || parsedWatchUrl.searchParams.get("v") !== videoId) {
        issues.push(`${path}.watchUrl must be a matching youtube.com watch URL`);
      }
    } catch {
      // The absolute HTTPS URL issue is already reported by readHttpsUrl().
    }
    return Object.freeze({
      type,
      videoId,
      title:readRequiredText(block, "title", path, issues),
      creator:readRequiredText(block, "creator", path, issues),
      duration:readRequiredText(block, "duration", path, issues),
      purpose:readRequiredText(block, "purpose", path, issues),
      watchFor:readRequiredText(block, "watchFor", path, issues),
      caveat:readRequiredText(block, "caveat", path, issues),
      prompt:readRequiredText(block, "prompt", path, issues),
      watchUrl,
    });
  }

  return Object.freeze({ type });
}

function validateStep(step, index, issues) {
  const path = `lesson.steps[${index}]`;
  if (!isRecord(step)) {
    issues.push(`${path} must be an object`);
    return null;
  }

  const id = readRequiredText(step, "id", path, issues);
  if (id && !STEP_ID_PATTERN.test(id)) {
    issues.push(`${path}.id must use stable lowercase kebab-case`);
  }

  const type = step.type ?? "explanation";
  if (!LESSON_STEP_TYPES.has(type)) {
    issues.push(`${path}.type "${String(type)}" is not supported`);
  }

  const code = readOptionalText(step, "code", path, issues);
  const language = readOptionalText(step, "language", path, issues);
  if (language && !LANGUAGE_PATTERN.test(language)) {
    issues.push(`${path}.language must contain only lowercase letters, numbers, or hyphens`);
  }

  const rawBlocks = step.blocks;
  if (rawBlocks !== undefined && (!Array.isArray(rawBlocks) || (rawBlocks.length === 0 && type !== "question"))) {
    issues.push(`${path}.blocks must be a non-empty array when provided`);
  }
  const blocks = Array.isArray(rawBlocks)
    ? rawBlocks.map((block, blockIndex) => validateContentBlock(block, blockIndex, path, issues)).filter(Boolean)
    : [];
  const body = readOptionalText(step, "body", path, issues);
  let question;
  if (type === "question") {
    const source = step.question;
    if (!isRecord(source)) {
      issues.push(`${path}.question must be an object for question steps`);
    } else {
      const phase = readRequiredText(source, "phase", `${path}.question`, issues);
      if (!QUESTION_PHASES.has(phase)) issues.push(`${path}.question.phase "${phase}" is not supported`);
      if (!Array.isArray(source.choices) || source.choices.length < 2) {
        issues.push(`${path}.question.choices must contain at least two choices`);
      }
      const choices = Array.isArray(source.choices) ? source.choices.map((choice, choiceIndex) => {
        const choicePath = `${path}.question.choices[${choiceIndex}]`;
        if (!isRecord(choice)) {
          issues.push(`${choicePath} must be an object`);
          return null;
        }
        return Object.freeze({
          id:readRequiredText(choice, "id", choicePath, issues),
          label:readRequiredText(choice, "label", choicePath, issues),
          feedback:readRequiredText(choice, "feedback", choicePath, issues),
        });
      }).filter(Boolean) : [];
      const choiceIds = choices.map((choice) => choice.id);
      if (new Set(choiceIds).size !== choiceIds.length) issues.push(`${path}.question choice ids must be unique`);
      const correctChoiceId = readRequiredText(source, "correctChoiceId", `${path}.question`, issues);
      if (correctChoiceId && !choiceIds.includes(correctChoiceId)) {
        issues.push(`${path}.question.correctChoiceId must match a choice id`);
      }
      question = Object.freeze({
        phase,
        prompt:readRequiredText(source, "prompt", `${path}.question`, issues),
        choices:Object.freeze(choices),
        correctChoiceId,
        critical:Boolean(source.critical),
      });
    }
  } else if (!body && blocks.length === 0) {
    issues.push(`${path} must provide body text or content blocks`);
  }

  return Object.freeze({
    id,
    type,
    title: readRequiredText(step, "title", path, issues),
    body,
    tag: readOptionalText(step, "tag", path, issues),
    tip: readOptionalText(step, "tip", path, issues),
    code,
    language,
    filename: readOptionalText(step, "filename", path, issues),
    question,
    blocks:Object.freeze(blocks),
  });
}

export function validateLesson(candidate, { day } = {}) {
  const issues = [];
  if (!isRecord(candidate)) {
    return { ok:false, issues:["lesson must export an object"] };
  }

  if (candidate.sections !== undefined && candidate.steps === undefined) {
    issues.push("lesson must use the stable steps model; rename sections to steps and add a unique id to every step");
  }

  const rawSteps = candidate.steps;
  if (!Array.isArray(rawSteps) || rawSteps.length === 0) {
    issues.push("lesson.steps must be a non-empty array");
  }

  const steps = Array.isArray(rawSteps)
    ? rawSteps.map((step, index) => validateStep(step, index, issues)).filter(Boolean)
    : [];
  const stepIds = steps.map((step) => step.id).filter(Boolean);
  if (new Set(stepIds).size !== stepIds.length) {
    issues.push("lesson step ids must be unique");
  }

  const reward = candidate.reward;
  if (reward !== undefined && (!Number.isInteger(reward) || reward < 0 || reward > 10_000)) {
    issues.push("lesson.reward must be an integer between 0 and 10000");
  }

  const status = candidate.status ?? "published";
  if (!LESSON_STATUSES.has(status)) issues.push(`lesson.status "${String(status)}" is not supported`);
  const passingScore = candidate.passingScore ?? 80;
  if (!Number.isInteger(passingScore) || passingScore < 1 || passingScore > 100) {
    issues.push("lesson.passingScore must be an integer between 1 and 100");
  }

  const lesson = Object.freeze({
    title: readRequiredText(candidate, "title", "lesson", issues),
    summary: readRequiredText(candidate, "summary", "lesson", issues),
    status,
    outcome:readOptionalText(candidate, "outcome", "lesson", issues),
    mode:readOptionalText(candidate, "mode", "lesson", issues),
    mission: readOptionalText(candidate, "mission", "lesson", issues),
    duration: readOptionalText(candidate, "duration", "lesson", issues),
    level: readOptionalText(candidate, "level", "lesson", issues),
    reward,
    passingScore,
    authoringSource:readOptionalText(candidate, "authoringSource", "lesson", issues),
    steps: Object.freeze(steps),
  });

  return issues.length ? { ok:false, issues } : { ok:true, value:lesson };
}

export function defineLesson(candidate, options) {
  const result = validateLesson(candidate, options);
  if (!result.ok) throw new LessonValidationError(options?.day, result.issues);
  return result.value;
}
