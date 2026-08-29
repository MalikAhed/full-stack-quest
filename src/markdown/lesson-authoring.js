const DIRECTIVE_TYPES = new Set(["mcq", "true-false", "response", "sequence", "fill-blanks", "spot-bug", "code-question"]);
const CONTENT_DIRECTIVE_TYPES = new Set(["tip", "note", "remember", "warning", "mistake", "security", "accessibility", "reveal"]);
const STEP_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHARED_QUESTION_FIELDS = ["id", "title", "question", "prompt", "kicker", "explanation", "hint"];
const DIRECTIVE_FIELDS = new Map([
  ["mcq", new Set(SHARED_QUESTION_FIELDS)],
  ["true-false", new Set([...SHARED_QUESTION_FIELDS, "answer"])],
  ["response", new Set(["id", "title", "question", "prompt", "rubric", "rubric-title", "field-label", "placeholder", "max-length", "guide"])],
  ["sequence", new Set([...SHARED_QUESTION_FIELDS, "mascot", "placeholder"])],
  ["fill-blanks", new Set([...SHARED_QUESTION_FIELDS, "mascot", "code", "answers", "options", "code-label"])],
  ["spot-bug", new Set([...SHARED_QUESTION_FIELDS, "mascot", "code", "line", "reasons"])],
  ["code-question", new Set(["id", "title", "instructions", "requirements", "html", "css", "js", "checks"])],
]);

function slug(value, fallback) {
  const result = String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  return result || fallback;
}

function field(source, name, fallback = "") {
  const match = new RegExp(`^${name}:[ \\t]*(.+)$`, "im").exec(source);
  return match?.[1]?.trim() || fallback;
}

function section(source, name) {
  const lines = source.split("\n");
  const start = lines.findIndex((line) => new RegExp(`^${name}:[ \\t]*$`, "i").test(line));
  if (start < 0) return [];
  const result = [];
  let fenced = false;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^```/.test(line.trim())) fenced = !fenced;
    if (!fenced && /^[a-z][a-z0-9-]*:[ \t]*(?:.*)$/i.test(line) && !/^https?:/i.test(line)) break;
    result.push(line);
  }
  return result;
}

function listItems(lines) {
  return lines.map((line) => /^\s*-\s+(.+)$/.exec(line)?.[1]?.trim()).filter(Boolean);
}

function checkboxItems(source) {
  return source.split("\n").map((line) => {
    const match = /^\s*-\s+\[([ xX])\]\s+(.+)$/.exec(line);
    if (!match) return null;
    const text = match[2].trim();
    const explicitId = /^([a-z0-9]+(?:-[a-z0-9]+)*)\s*\|\s*(.+)$/i.exec(text);
    return { checked:match[1].toLowerCase() === "x", id:explicitId?.[1] || "", text:explicitId?.[2]?.trim() || text };
  }).filter(Boolean);
}

function validateDirectiveFields(source, type, index, issues) {
  const allowed = DIRECTIVE_FIELDS.get(type);
  let fenced = false;
  source.split("\n").forEach((line) => {
    if (/^```/.test(line.trim())) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    const match = /^([a-z][a-z0-9-]*):(?:[ \t].*)?$/i.exec(line.trim());
    const name = match?.[1]?.toLowerCase();
    if (name && !allowed.has(name) && name !== "http" && name !== "https") {
      issues.push(`Step ${index + 1} (${type}) uses unsupported field “${name}”.`);
    }
  });
}

function validateDirectiveBody(source, type, index, issues) {
  if (containsRawHtml(source)) {
    issues.push(`Step ${index + 1} (${type}) must not contain raw HTML outside a fenced lesson example.`);
  }
  let fenced = false;
  source.split("\n").forEach((line) => {
    if (/^```/.test(line.trim())) {
      fenced = !fenced;
      return;
    }
    if (!fenced && /^:::[a-z][a-z0-9-]*/i.test(line.trim())) {
      issues.push(`Step ${index + 1} (${type}) must not contain a nested lesson directive.`);
    }
  });
}

function validateContentDirectiveBlocks(source, issues) {
  let active = "";
  let fenced = false;
  source.split("\n").forEach((line) => {
    if (/^```/.test(line.trim())) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    if (/^:::\s*$/.test(line.trim())) {
      active = "";
      return;
    }
    const opening = /^:::([a-z][a-z0-9-]*)(?:[ \t]+.*)?$/i.exec(line.trim());
    const type = opening?.[1]?.toLowerCase();
    if (!type || !CONTENT_DIRECTIVE_TYPES.has(type)) return;
    if (active) issues.push(`Content directive :::${type} must not be nested inside :::${active}.`);
    else active = type;
  });
  if (active) issues.push(`The :::${active} block is missing its closing :::.`);
}

function containsRawHtml(source) {
  let fenced = false;
  return source.split("\n").some((line) => {
    if (/^```/.test(line.trim())) {
      fenced = !fenced;
      return false;
    }
    if (fenced) return false;
    const withoutInlineCode = line.replace(/`[^`\n]*`/g, "");
    return /<\/?[A-Za-z][A-Za-z0-9-]*(?=\s|\/?>)/.test(withoutInlineCode);
  });
}

function fencedCode(lines) {
  const start = lines.findIndex((line) => /^```/.test(line.trim()));
  if (start < 0) return "";
  const endOffset = lines.slice(start + 1).findIndex((line) => /^```\s*$/.test(line.trim()));
  const end = endOffset < 0 ? lines.length : start + 1 + endOffset;
  return lines.slice(start + 1, end).join("\n");
}

function commonConfig(source, type, index) {
  const title = field(source, "title", type === "mcq" ? "Knowledge check" : "Practice step");
  return {
    kicker:field(source, "kicker", type === "mcq" ? "KNOWLEDGE CHECK · CHOOSE ONE" : "PRACTICE"),
    title,
    prompt:field(source, "question", field(source, "prompt", title)),
    mascot:field(source, "mascot", "Take it one step at a time."),
    correctFeedback:field(source, "explanation", "Correct."),
    wrongFeedback:field(source, "hint", "Review the lesson and try again."),
    authoringId:`authored-${type}-${index + 1}`,
  };
}

function parseMcq(source, type, index, issues) {
  const config = commonConfig(source, "mcq", index);
  config.phase = "practice";
  config.critical = false;
  let choices = checkboxItems(source);
  if (type === "true-false") {
    if (choices.length > 0) issues.push(`Step ${index + 1} (true-false) must use answer: true or answer: false instead of checkbox choices.`);
    const answer = field(source, "answer").toLowerCase();
    if (!["true", "false"].includes(answer)) issues.push(`Step ${index + 1} (true-false) answer must be true or false.`);
    choices = ["true", "false"].map((value) => ({ checked:value === answer, id:value, text:value === "true" ? "True" : "False" }));
  }
  if (choices.length < 2) issues.push(`Step ${index + 1} (${type}) needs at least two answer choices.`);
  if (type === "mcq" && choices.filter((choice) => choice.checked).length !== 1) issues.push(`Step ${index + 1} (${type}) must mark exactly one answer with [x].`);
  const explicitIds = choices.map((choice) => choice.id).filter(Boolean);
  if (new Set(explicitIds).size !== explicitIds.length) issues.push(`Step ${index + 1} (${type}) answer ids must be unique.`);
  const used = new Set();
  config.answers = choices.map((choice, choiceIndex) => {
    let id = choice.id || slug(choice.text, `choice-${choiceIndex + 1}`);
    while (used.has(id)) id = `${id}-${choiceIndex + 1}`;
    used.add(id);
    const text = /^https?:\/\/[^\s]+$/i.test(choice.text) ? `\`${choice.text}\`` : choice.text;
    return { id, text, correct:choice.checked };
  });
  config.idleFeedback = "Select the best answer, then check your choice.";
  config.selectedFeedback = "Answer selected. Check it when you are ready.";
  return { type:"mcq", content:config };
}

function parseResponse(source, index, issues) {
  const config = commonConfig(source, "response", index);
  const rubric = listItems(section(source, "rubric"));
  if (rubric.length === 0) issues.push(`Step ${index + 1} (response) needs a rubric list.`);
  if (rubric.length > 8) issues.push(`Step ${index + 1} (response) rubric can contain at most eight items.`);
  if (rubric.some((item) => item.length > 240)) issues.push(`Step ${index + 1} (response) rubric items can contain at most 240 characters.`);
  const maxLength = Number(field(source, "max-length", "420"));
  const validMaxLength = Number.isInteger(maxLength) && maxLength >= 80 && maxLength <= 2000;
  if (!validMaxLength) issues.push(`Step ${index + 1} (response) max-length must be an integer from 80 to 2000.`);
  if (config.title.length > 160) issues.push(`Step ${index + 1} (response) title can contain at most 160 characters.`);
  if (config.prompt.length > 800) issues.push(`Step ${index + 1} (response) question can contain at most 800 characters.`);
  config.rubricTitle = field(source, "rubric-title", "A strong answer includes");
  config.rubric = rubric;
  config.fieldLabel = field(source, "field-label", "Your explanation");
  config.placeholder = field(source, "placeholder", "Explain the idea in your own words...");
  config.maxLength = validMaxLength ? maxLength : 420;
  config.guideTitle = config.title;
  config.guide = field(source, "guide", config.prompt);
  config.review = { passScore:8 };
  return { type:"response", route:"lesson-authoring-preview", content:config };
}

function parseSequence(source, index, issues) {
  const config = commonConfig(source, "sequence", index);
  const ranked = source.split("\n").map((line) => {
    const match = /^\s*-\s+\[(\d+)\]\s+(.+)$/.exec(line);
    if (!match) return null;
    const explicitId = /^([a-z0-9]+(?:-[a-z0-9]+)*)\s*\|\s*(.+)$/i.exec(match[2].trim());
    const text = explicitId?.[2]?.trim() || match[2].trim();
    return { rank:Number(match[1]), id:explicitId?.[1] || slug(text, `step-${match[1]}`), text };
  }).filter(Boolean);
  if (ranked.length < 2) issues.push(`Step ${index + 1} (sequence) needs at least two ranked items such as - [1] id | Label.`);
  const ranks = ranked.map((item) => item.rank);
  if (new Set(ranks).size !== ranks.length || ranked.some((_, itemIndex) => !ranks.includes(itemIndex + 1))) {
    issues.push(`Step ${index + 1} (sequence) ranks must be unique and consecutive from 1.`);
  }
  const ids = ranked.map((item) => item.id);
  if (new Set(ids).size !== ids.length) issues.push(`Step ${index + 1} (sequence) item ids must be unique.`);
  config.placeholder = field(source, "placeholder", "Choose a step below");
  config.steps = [...ranked].sort((a, b) => b.rank - a.rank).map(({ id, text }) => ({ id, text }));
  config.expected = [...ranked].sort((a, b) => a.rank - b.rank).map(({ id }) => id);
  return { type:"sequence", content:config };
}

function parseFillBlanks(source, index, issues) {
  const config = commonConfig(source, "fill-blanks", index);
  const code = fencedCode(section(source, "code"));
  const answerEntries = listItems(section(source, "answers")).map((item) => {
    const separator = item.indexOf("|");
    return separator < 0 ? ["", ""] : [item.slice(0, separator).trim().toLowerCase(), item.slice(separator + 1).trim()];
  }).filter(([name, value]) => name && value);
  const answerNames = answerEntries.map(([name]) => name);
  if (new Set(answerNames).size !== answerNames.length) issues.push(`Step ${index + 1} (fill-blanks) answer names must be unique.`);
  const answers = Object.fromEntries(answerEntries);
  const options = listItems(section(source, "options")).map((item) => item.replace(/^`|`$/g, ""));
  const names = [];
  const fragments = [];
  let cursor = 0;
  const expression = /\[\[([a-z0-9-]+)\]\]/gi;
  let match;
  while ((match = expression.exec(code))) {
    fragments.push(code.slice(cursor, match.index));
    names.push(match[1].toLowerCase());
    cursor = match.index + match[0].length;
  }
  fragments.push(code.slice(cursor));
  if (!code || names.length === 0) issues.push(`Step ${index + 1} (fill-blanks) needs a fenced code block containing [[blank-name]].`);
  if (names.some((name) => !answers[name])) issues.push(`Step ${index + 1} (fill-blanks) needs an answer for every named blank.`);
  if (options.length < names.length) issues.push(`Step ${index + 1} (fill-blanks) needs enough options for its blanks.`);
  const optionCounts = new Map();
  options.forEach((option) => optionCounts.set(option, (optionCounts.get(option) || 0) + 1));
  const missingOptions = names.map((name) => answers[name]).filter(Boolean).filter((answer) => {
    const remaining = optionCounts.get(answer) || 0;
    if (remaining === 0) return true;
    optionCounts.set(answer, remaining - 1);
    return false;
  });
  if (missingOptions.length > 0) issues.push(`Step ${index + 1} (fill-blanks) options must include every correct answer, including duplicates used more than once.`);
  config.codeLabel = field(source, "code-label", "Code with blanks");
  config.fragments = fragments;
  config.blanks = names;
  config.expected = names.map((name) => answers[name] || "");
  config.options = options;
  return { type:"fill-blanks", content:config };
}

function parseSpotBug(source, index, issues) {
  const config = commonConfig(source, "spot-bug", index);
  const code = fencedCode(section(source, "code"));
  const choices = checkboxItems(section(source, "reasons").join("\n"));
  const correctLine = Number(field(source, "line"));
  if (!code) issues.push(`Step ${index + 1} (spot-bug) needs a fenced code block.`);
  if (!Number.isInteger(correctLine) || correctLine < 1 || correctLine > code.split("\n").length) issues.push(`Step ${index + 1} (spot-bug) needs a valid line number.`);
  if (choices.length < 2 || choices.filter((choice) => choice.checked).length !== 1) issues.push(`Step ${index + 1} (spot-bug) needs at least two reasons and exactly one [x] reason.`);
  const reasonIds = choices.map((choice, choiceIndex) => choice.id || slug(choice.text, `reason-${choiceIndex + 1}`));
  if (new Set(reasonIds).size !== reasonIds.length) issues.push(`Step ${index + 1} (spot-bug) reason ids must be unique.`);
  config.lines = code.split("\n");
  config.reasons = choices.map((choice, choiceIndex) => ({ id:reasonIds[choiceIndex], text:choice.text }));
  config.correctLine = correctLine;
  config.correctReason = reasonIds[choices.findIndex((choice) => choice.checked)] || "correct";
  return { type:"spot-bug", content:config };
}

function parseCodeCheck(item, index, stepIndex, issues) {
  const parts = item.split("|").map((part) => part.trim());
  const type = parts.shift()?.toLowerCase();
  if (type === "html-selector") {
    const selector = parts.join("|").trim();
    if (!selector) issues.push(`Step ${stepIndex + 1} (code-question) check ${index + 1} needs an HTML selector.`);
    return { type, selector };
  }
  if (type === "css-property") {
    const properties = parts.join("|").split(",").map((property) => property.trim().toLowerCase()).filter(Boolean);
    if (properties.length === 0 || properties.some((property) => !/^(?:--)?[a-z][a-z0-9-]*$/.test(property))) {
      issues.push(`Step ${stepIndex + 1} (code-question) check ${index + 1} needs valid CSS properties.`);
    }
    return { type, properties };
  }
  if (type === "file-contains") {
    const file = parts.shift()?.toLowerCase();
    const value = parts.shift() || "";
    const caseMode = parts.shift()?.toLowerCase() || "case-sensitive";
    if (!["html", "css", "js"].includes(file)) issues.push(`Step ${stepIndex + 1} (code-question) check ${index + 1} must name html, css, or js.`);
    if (!value) issues.push(`Step ${stepIndex + 1} (code-question) check ${index + 1} needs text to find.`);
    if (!["case-sensitive", "case-insensitive"].includes(caseMode)) issues.push(`Step ${stepIndex + 1} (code-question) check ${index + 1} must use case-sensitive or case-insensitive.`);
    return { type, file, value, caseSensitive:caseMode !== "case-insensitive" };
  }
  issues.push(`Step ${stepIndex + 1} (code-question) check ${index + 1} uses unsupported type “${type || "empty"}”.`);
  return { type:"unsupported" };
}

function parseCodeQuestion(source, index, issues) {
  const title = field(source, "title", "Code challenge");
  const instructions = section(source, "instructions").join("\n").trim();
  const requirements = listItems(section(source, "requirements"));
  const checks = listItems(section(source, "checks")).map((item, checkIndex) => parseCodeCheck(item, checkIndex, index, issues));
  const files = {
    html:fencedCode(section(source, "html")),
    css:fencedCode(section(source, "css")),
    js:fencedCode(section(source, "js")),
  };
  if (!instructions) issues.push(`Step ${index + 1} (code-question) needs instructions.`);
  if (requirements.length === 0) issues.push(`Step ${index + 1} (code-question) needs a requirements list.`);
  if (checks.length === 0) issues.push(`Step ${index + 1} (code-question) needs at least one declarative check.`);
  if (requirements.length !== checks.length) issues.push(`Step ${index + 1} (code-question) needs one check for each requirement.`);
  if (!Object.values(files).some(Boolean)) issues.push(`Step ${index + 1} (code-question) needs at least one starter file.`);
  const requirementsMarkdown = requirements.map((requirement) => `- [ ] ${requirement}`).join("\n");
  return {
    type:"code-question",
    content:{
      title,
      instructions:`# ${title}\n\n${instructions}\n\n## Requirements\n\n${requirementsMarkdown}`,
      files,
      checks,
    },
  };
}

function parseDirective(type, source, index, issues) {
  validateDirectiveFields(source, type, index, issues);
  validateDirectiveBody(source, type, index, issues);
  if (type === "mcq" || type === "true-false") return parseMcq(source, type, index, issues);
  if (type === "response") return parseResponse(source, index, issues);
  if (type === "sequence") return parseSequence(source, index, issues);
  if (type === "fill-blanks") return parseFillBlanks(source, index, issues);
  if (type === "spot-bug") return parseSpotBug(source, index, issues);
  if (type === "code-question") return parseCodeQuestion(source, index, issues);
  return null;
}

function markdownStep(source, index) {
  const heading = /^#{1,3}\s+(.+)$/m.exec(source)?.[1]?.replace(/[*_`]/g, "").trim();
  const explicitId = /^<!--\s*step-id:\s*([a-z0-9]+(?:-[a-z0-9]+)*)\s*-->$/im.exec(source)?.[1];
  return { type:"markdown", id:explicitId || `authored-content-${index + 1}`, title:heading || `Lesson content ${index + 1}`, source:source.trim() };
}

function validatePublishedFields(chunks, issues) {
  const feedbackTypes = new Set(["mcq", "true-false", "sequence", "fill-blanks", "spot-bug"]);
  chunks.forEach((chunk, index) => {
    if (chunk.kind === "markdown") {
      if (!/^<!--\s*step-id:\s*[a-z0-9]+(?:-[a-z0-9]+)*\s*-->$/im.test(chunk.source)) {
        issues.push(`Published explanation step ${index + 1} needs <!-- step-id: stable-kebab-id -->.`);
      }
      return;
    }
    const required = ["id", "title"];
    if (chunk.type !== "code-question") required.push("question-or-prompt");
    if (feedbackTypes.has(chunk.type)) required.push("explanation", "hint");
    required.forEach((name) => {
      const present = name === "question-or-prompt"
        ? Boolean(field(chunk.source, "question") || field(chunk.source, "prompt"))
        : Boolean(field(chunk.source, name));
      if (!present) {
        const label = name === "question-or-prompt" ? "question or prompt" : name;
        issues.push(`Published step ${index + 1} (${chunk.type}) needs a non-empty ${label} field.`);
      }
    });
  });
}

export function parseLessonMarkdown(source, { published = false } = {}) {
  const lines = String(source).replace(/\r\n?/g, "\n").split("\n");
  const chunks = [];
  const issues = [];
  let markdown = [];
  let fenced = false;

  const flushMarkdown = () => {
    const value = markdown.join("\n").trim();
    if (value) {
      if (containsRawHtml(value)) issues.push("Lesson Markdown must not contain raw HTML; use supported Markdown or a lesson directive instead.");
      validateContentDirectiveBlocks(value, issues);
      chunks.push({ kind:"markdown", source:value });
    }
    markdown = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^```/.test(line.trim())) fenced = !fenced;
    if (!fenced && /^<!--\s*lesson-step\s*-->$/i.test(line.trim())) {
      flushMarkdown();
      continue;
    }
    const anyOpening = !fenced ? /^:::([a-z][a-z0-9-]*)(?:[ \t]+.*)?$/i.exec(line.trim()) : null;
    const openingType = anyOpening?.[1]?.toLowerCase();
    const opening = !fenced ? /^:::(\S+)\s*$/.exec(line.trim()) : null;
    if (anyOpening && !DIRECTIVE_TYPES.has(openingType) && !CONTENT_DIRECTIVE_TYPES.has(openingType)) {
      issues.push(`Unsupported lesson directive :::${openingType}.`);
    } else if (anyOpening && DIRECTIVE_TYPES.has(openingType) && !opening) {
      issues.push(`Interactive directive :::${openingType} must open on a line by itself.`);
    }
    if (!opening || !DIRECTIVE_TYPES.has(opening[1].toLowerCase())) {
      markdown.push(line);
      continue;
    }
    flushMarkdown();
    const type = opening[1].toLowerCase();
    const body = [];
    let closed = false;
    let directiveFence = false;
    for (index += 1; index < lines.length; index += 1) {
      const directiveLine = lines[index];
      if (/^```/.test(directiveLine.trim())) directiveFence = !directiveFence;
      if (!directiveFence && /^:::\s*$/.test(directiveLine.trim())) { closed = true; break; }
      body.push(directiveLine);
    }
    if (!closed) issues.push(`The :::${type} block is missing its closing :::.`);
    chunks.push({ kind:"directive", type, source:body.join("\n") });
  }
  flushMarkdown();
  if (published) validatePublishedFields(chunks, issues);

  const steps = chunks.map((chunk, index) => chunk.kind === "markdown"
    ? markdownStep(chunk.source, index)
    : { ...parseDirective(chunk.type, chunk.source, index, issues), id:field(chunk.source, "id", `authored-${chunk.type}-${index + 1}`) }).filter(Boolean);
  const stepIds = steps.map((step) => step.id);
  if (new Set(stepIds).size !== stepIds.length) issues.push("Every authored lesson step needs a unique id.");
  if (stepIds.some((id) => !STEP_ID_PATTERN.test(id))) issues.push("Every authored lesson step id must use lowercase kebab-case.");
  const documentSource = chunks.filter((chunk) => chunk.kind === "markdown").map((chunk) => chunk.source).join("\n\n---\n\n");
  if (steps.length === 0) issues.push("Add Markdown content or an interactive directive to create a lesson preview.");
  return { steps, issues, documentSource };
}

export const LESSON_AUTHORING_DIRECTIVES = Object.freeze([...DIRECTIVE_TYPES]);
export const LESSON_CONTENT_DIRECTIVES = Object.freeze([...CONTENT_DIRECTIVE_TYPES]);
