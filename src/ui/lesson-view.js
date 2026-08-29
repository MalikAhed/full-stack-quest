import { escapeHtml } from "../lib/dom.js";
import { XP_PER_LESSON } from "../domain/progression.js";
import { highlightCode } from "../lib/prism.js";
import { mountMarkdownFeatures, renderLessonInline, renderMarkdownDocument } from "../markdown/renderer.js";
import { compileLessonMarkdown } from "../markdown/lesson-model.js";
import { mountLessonMarkdown, mountLessonVideos, renderLessonContent } from "./lesson-content.js";
import { renderShipReadyContent } from "./ship-ready-level.js";
import { renderTemplateFooter, renderTemplateShell } from "./template-shell.js";
import { loadDesignSystem } from "./design-system-loader.js";
import { renderUiLab } from "./ui-lab/index.js";

const LESSON_ACTION = Object.freeze({ CHECK:"check", RETRY:"retry", CONTINUE:"continue" });

function renderQuestion(step, titleId) {
  return renderShipReadyContent("mcq", {
    kicker:step.tag || "CHECK", title:step.title, prompt:step.question.prompt,
    answers:step.question.choices.map((choice) => ({ id:choice.id, text:choice.label, correct:choice.id === step.question.correctChoiceId })),
  }, { titleId, answerAttribute:"data-answer" });
}

function renderStep(step, index) {
  const isQuestion = step.type === "question";
  const titleId = `lesson-step-title-${escapeHtml(step.id)}`;
  const content = isQuestion ? renderQuestion(step, titleId) : `<div class="level-lesson-copy ready-lesson-copy"><header class="ready-lesson-heading"><p class="level-layout-kicker">${escapeHtml(step.tag || "LEARN")}</p><h1 id="${titleId}">${escapeHtml(step.title)}</h1></header>${renderLessonContent(step)}${step.tip ? `<aside class="lesson-tip"><strong>FIELD NOTE</strong><span>${renderLessonInline(step.tip)}</span></aside>` : ""}${step.code ? `<div class="lesson-code"><div><span>${escapeHtml(step.filename || `example.${step.language === "css" ? "css" : "js"}`)}</span><b>${escapeHtml(step.language || "CODE")}</b></div><pre><code class="language-${escapeHtml(step.language || "javascript")}">${escapeHtml(step.code)}</code></pre></div>` : ""}</div>`;
  const footer = renderTemplateFooter({
    feedback:isQuestion ? "Select an answer, then check it." : "",
    feedbackClass:isQuestion ? "level-feedback lesson-question-feedback" : "level-feedback",
    feedbackAttributes:isQuestion ? { "data-question-feedback":true, "aria-live":"polite" } : {},
    backAttributes:{ "data-flow-back":true, disabled:index === 0 },
    primaryLabel:isQuestion ? "CHECK ANSWER" : "CONTINUE",
    primaryAttributes:{ "data-flow-next":true, disabled:isQuestion },
  });
  return `<section class="ready-lesson-stage" data-lesson-step="${escapeHtml(step.id)}" ${index === 0 ? "" : "hidden"} tabindex="-1" aria-labelledby="${titleId}">${renderTemplateShell({ content, footer, titleId })}</section>`;
}

export function renderLessonLoading(container, day) {
  container.innerHTML = `
    <section class="lesson-hero lesson-hero--coming-soon lesson-loading" role="status" aria-live="polite">
      <p class="lesson-label">DAY ${day}</p>
      <h1 class="lesson-heading">Loading today’s quest…</h1>
      <p class="lesson-intro">Preparing the lesson path.</p>
    </section>`;
  return `Day ${day}: Loading · Full-Stack Quest`;
}

export function renderLessonError(container, day, onRetry) {
  const controller = new AbortController();
  container.innerHTML = `
    <section class="lesson-hero lesson-hero--coming-soon lesson-error" role="alert">
      <p class="lesson-label">DAY ${day} · QUEST UNAVAILABLE</p>
      <h1 class="lesson-heading">This lesson could not be loaded</h1>
      <p class="lesson-intro">Your progress is safe. Check your connection and try again.</p>
      <button class="lesson-retry" type="button" data-retry-lesson>TRY AGAIN</button>
    </section>`;
  container.querySelector("[data-retry-lesson]").addEventListener("click", onRetry, { signal:controller.signal });
  return { title:`Day ${day}: Lesson Unavailable · Full-Stack Quest`, destroy:() => controller.abort() };
}

function renderComingSoon(container, day) {
  container.innerHTML = `
    <section class="lesson-hero lesson-hero--coming-soon">
      <p class="lesson-label">DAY ${day} · IN PROGRESS</p>
      <h1 class="lesson-heading">Something exciting is coming soon</h1>
      <p class="lesson-intro">This lesson is being prepared. Check back soon.</p>
    </section>`;
}

function renderInteractiveLesson(container, day, lesson, { progress, onProgress }) {
  const controller = new AbortController();
  const { signal } = controller;
  const steps = lesson.steps;
  const checkpointStart = steps.findIndex((step) => step.question?.phase === "checkpoint");
  const checkpointSteps = steps.filter((step) => step.question?.phase === "checkpoint");
  const savedStepIds = new Set((progress?.completedStepIds || []).filter((id) => steps.some((step) => step.id === id)));
  let isFinished = Boolean(progress?.completedAt) && steps.every((step) => savedStepIds.has(step.id));
  let resultVisible = isFinished;
  let currentIndex = isFinished ? steps.length : Math.max(0, steps.findIndex((step) => !savedStepIds.has(step.id) && step.question?.phase !== "checkpoint"));
  if (!isFinished && currentIndex < 0) currentIndex = checkpointStart >= 0 ? checkpointStart : steps.length - 1;
  const checkpointAnswers = new Map();
  const questionUiState = new Map();
  const shell = container.closest(".lesson-shell") || container;
  const backButton = shell.querySelector(".lesson-back");
  const topProgress = shell.querySelector(".lesson-top-title");
  const lessonStatus = shell.querySelector(".lesson-status");
  const hasAppChrome = Boolean(backButton && topProgress && lessonStatus);
  const previousChrome = {
    backText:backButton?.textContent, backLabel:backButton?.getAttribute("aria-label"), statusHidden:lessonStatus?.hidden,
    progressRole:topProgress?.getAttribute("role"), progressLabel:topProgress?.getAttribute("aria-label"),
  };
  if (hasAppChrome) {
    document.body.classList.add("ui-lab-open", "ui-lab-template-open", "ready-lesson-open");
    shell.classList.add("lesson-shell--ui-lab", "lesson-shell--ready-lesson");
    container.classList.add("lesson-card--ui-lab", "lesson-card--ready-lesson");
    backButton.textContent = "×";
    backButton.setAttribute("aria-label", "Close lesson");
    lessonStatus.hidden = true;
    topProgress.setAttribute("role", "progressbar");
    topProgress.setAttribute("aria-label", `${lesson.title} progress`);
    topProgress.setAttribute("aria-valuemin", "0");
    topProgress.setAttribute("aria-valuemax", String(steps.length));
  }

  container.innerHTML = `
    <article class="lesson-flow ready-lesson-flow">
      <div class="lesson-stage-list ready-lesson-stage-list">${steps.map(renderStep).join("")}</div>
      <section class="ready-lesson-stage lesson-result" data-lesson-result ${isFinished ? "" : "hidden"} tabindex="-1" aria-labelledby="lesson-result-title">
        ${renderTemplateShell({
          titleId:"lesson-result-title",
          content:`<div class="level-lesson-copy ready-lesson-result"><p class="level-layout-kicker" data-result-kicker>${isFinished ? "LESSON PASSED" : "FINAL CHECKPOINT"}</p><h1 id="lesson-result-title" data-result-title>${isFinished ? `You passed Day ${day}` : "Your result"}</h1><p data-result-message>${isFinished ? "Your saved result shows that you passed this checkpoint." : ""}</p><div class="lesson-result-score"><strong data-result-score>${isFinished ? "PASS" : ""}</strong><span data-result-detail>${isFinished ? `Checkpoint complete · ${XP_PER_LESSON} XP earned` : ""}</span></div></div>`,
          footer:renderTemplateFooter({ backLabel:"REVIEW LESSON", backAttributes:{ "data-review-lesson":true }, primaryLabel:"RETRY FINAL", primaryAttributes:{ "data-retry-checkpoint":true, hidden:isFinished } }),
          showScrollIndicator:false,
        })}
      </section>
    </article>`;

  if (container.querySelector('.lesson-code pre code[class*="language-"]')) highlightCode(container, signal);
  mountLessonVideos(container, signal);
  mountLessonMarkdown(container, signal);

  const stageElements = [...container.querySelectorAll("[data-lesson-step]")];
  const result = container.querySelector("[data-lesson-result]");

  const announceProgress = (complete = false) => onProgress?.({ completedStepIds:[...savedStepIds], isComplete:complete });
  const setAction = (button, state, label) => {
    button.dataset.actionState = state;
    button.querySelector("[data-template-action-label]").textContent = label;
  };
  const resetFeedback = (feedback, text = "Select an answer, then check it.") => {
    feedback.className = "level-feedback lesson-question-feedback";
    feedback.textContent = text;
  };
  const focusCurrent = () => window.requestAnimationFrame(() => (resultVisible ? result : stageElements[currentIndex])?.focus({ preventScroll:true }));
  const showCurrent = ({ focus = true } = {}) => {
    stageElements.forEach((stage, index) => { stage.hidden = resultVisible || index !== currentIndex; });
    result.hidden = !resultVisible;
    const value = resultVisible ? steps.length : currentIndex + 1;
    if (hasAppChrome) {
      topProgress.setAttribute("aria-valuenow", String(value));
      shell.style.setProperty("--lesson-progress", `${(value / steps.length) * 100}%`);
      document.body.classList.toggle("ui-lab-mcq-open", !resultVisible && steps[currentIndex]?.type === "question");
    }
    if (focus) focusCurrent();
  };

  const showResult = () => {
    if (checkpointSteps.length === 0) {
      isFinished = true;
      resultVisible = true;
      result.querySelector("[data-result-kicker]").textContent = "LESSON COMPLETE";
      result.querySelector("[data-result-title]").textContent = `You completed Day ${day}`;
      result.querySelector("[data-result-message]").textContent = "You completed every lesson step.";
      result.querySelector("[data-result-score]").textContent = "DONE";
      result.querySelector("[data-result-detail]").textContent = `Lesson complete · +${XP_PER_LESSON} XP`;
      result.querySelector("[data-retry-checkpoint]").hidden = true;
      steps.forEach((step) => savedStepIds.add(step.id));
      announceProgress(true);
      showCurrent();
      return;
    }
    const correct = checkpointSteps.filter((step) => checkpointAnswers.get(step.id) === step.question.correctChoiceId).length;
    const criticalSteps = checkpointSteps.filter((step) => step.question.critical);
    const criticalPassed = criticalSteps
      .every((step) => checkpointAnswers.get(step.id) === step.question.correctChoiceId);
    const percent = Math.round((correct / checkpointSteps.length) * 100);
    const passed = percent >= lesson.passingScore && criticalPassed;
    isFinished = passed;
    resultVisible = true;
    result.querySelector("[data-result-kicker]").textContent = passed ? "LESSON PASSED" : "NOT PASSED YET";
    result.querySelector("[data-result-title]").textContent = passed ? `You passed Day ${day}` : "Review the missed ideas";
    result.querySelector("[data-result-message]").textContent = passed
      ? `You reached ${lesson.passingScore}%${criticalSteps.length ? ` and answered ${criticalSteps.length === 1 ? "the critical question" : `all ${criticalSteps.length} critical questions`} correctly` : ""}.`
      : criticalPassed ? `You need ${lesson.passingScore}% to pass. Retry the final with a fresh attempt.` : `${criticalSteps.length === 1 ? "The critical question is" : "One or more critical questions are"} unresolved. Review the lesson, then retry.`;
    result.querySelector("[data-result-score]").textContent = `${percent}%`;
    result.querySelector("[data-result-detail]").textContent = `${correct} of ${checkpointSteps.length} correct${passed ? ` · +${XP_PER_LESSON} XP` : ""}`;
    result.querySelector("[data-retry-checkpoint]").hidden = passed;
    if (passed) {
      steps.forEach((step) => savedStepIds.add(step.id));
      announceProgress(true);
    } else announceProgress(false);
    showCurrent();
  };

  stageElements.forEach((stage, index) => {
    const step = steps[index];
    const nextButton = stage.querySelector("[data-flow-next]");
    stage.querySelector("[data-flow-back]").addEventListener("click", () => {
      if (index === 0) return;
      currentIndex = index - 1;
      showCurrent();
    }, { signal });

    if (step.type !== "question") {
      nextButton.addEventListener("click", () => {
        savedStepIds.add(step.id);
        announceProgress(false);
        if (index === steps.length - 1) showResult();
        else {
          currentIndex = index + 1;
          showCurrent();
        }
      }, { signal });
      return;
    }

    const answers = [...stage.querySelectorAll("[data-answer]")];
    const feedback = stage.querySelector("[data-question-feedback]");
    const state = { selectedId:null, checked:false };
    questionUiState.set(step.id, state);
    setAction(nextButton, LESSON_ACTION.CHECK, "CHECK ANSWER");
    answers.forEach((answer) => answer.addEventListener("click", () => {
      if (state.checked && step.question.phase === "checkpoint") return;
      state.selectedId = answer.dataset.answer;
      state.checked = false;
      answers.forEach((option) => {
        option.classList.toggle("is-selected", option === answer);
        option.classList.remove("is-correct", "is-wrong");
        option.setAttribute("aria-pressed", String(option === answer));
      });
      resetFeedback(feedback, "Answer selected. Check it when you are ready.");
      nextButton.disabled = false;
      setAction(nextButton, LESSON_ACTION.CHECK, "CHECK ANSWER");
    }, { signal }));

    nextButton.addEventListener("click", () => {
      if (nextButton.dataset.actionState === LESSON_ACTION.RETRY) {
        state.selectedId = null; state.checked = false;
        answers.forEach((answer) => { answer.classList.remove("is-selected", "is-correct", "is-wrong"); answer.setAttribute("aria-pressed", "false"); });
        resetFeedback(feedback); nextButton.disabled = true; setAction(nextButton, LESSON_ACTION.CHECK, "CHECK ANSWER");
        return;
      }
      if (!state.selectedId) return;
      if (!state.checked) {
        state.checked = true;
        const selectedChoice = step.question.choices.find((answer) => answer.id === state.selectedId);
        const correct = state.selectedId === step.question.correctChoiceId;
        const selectedButton = answers.find((answer) => answer.dataset.answer === state.selectedId);
        selectedButton.classList.add(correct ? "is-correct" : "is-wrong");
        feedback.classList.add(correct ? "is-correct" : "is-wrong", correct ? "is-success" : "is-error");
        feedback.innerHTML = renderLessonInline(selectedChoice.feedback);
        if (step.question.phase === "practice") {
          setAction(nextButton, correct ? LESSON_ACTION.CONTINUE : LESSON_ACTION.RETRY, correct ? "CONTINUE" : "TRY AGAIN");
          if (!correct) state.checked = false;
          if (correct) savedStepIds.add(step.id);
        } else {
          checkpointAnswers.set(step.id, state.selectedId);
          answers.forEach((answer) => { answer.disabled = true; });
          setAction(nextButton, LESSON_ACTION.CONTINUE, index === steps.length - 1 ? "SEE RESULT" : "NEXT QUESTION");
        }
        return;
      }
      if (step.question.phase === "practice") announceProgress(false);
      if (index === steps.length - 1) showResult();
      else {
        currentIndex = index + 1;
        showCurrent();
      }
    }, { signal });
  });

  result.querySelector("[data-review-lesson]").addEventListener("click", () => {
    if (!isFinished) result.querySelector("[data-retry-checkpoint]").click();
    resultVisible = false;
    currentIndex = 0;
    showCurrent();
  }, { signal });
  result.querySelector("[data-retry-checkpoint]").addEventListener("click", () => {
    checkpointAnswers.clear();
    checkpointSteps.forEach((step) => {
      const state = questionUiState.get(step.id);
      state.selectedId = null;
      state.checked = false;
      const stage = container.querySelector(`[data-lesson-step="${step.id}"]`);
      stage.querySelectorAll("[data-answer]").forEach((answer) => {
        answer.disabled = false;
        answer.classList.remove("is-selected", "is-correct", "is-wrong");
        answer.setAttribute("aria-pressed", "false");
      });
      resetFeedback(stage.querySelector("[data-question-feedback]"));
      stage.querySelector("[data-flow-next]").disabled = true;
      setAction(stage.querySelector("[data-flow-next]"), LESSON_ACTION.CHECK, "CHECK ANSWER");
    });
    isFinished = false;
    resultVisible = false;
    currentIndex = checkpointStart;
    showCurrent();
  }, { signal });

  showCurrent({ focus:false });
  return () => {
    controller.abort();
    if (!hasAppChrome) return;
    document.body.classList.remove("ui-lab-open", "ui-lab-template-open", "ui-lab-mcq-open", "ready-lesson-open");
    shell.classList.remove("lesson-shell--ui-lab", "lesson-shell--ready-lesson");
    shell.style.removeProperty("--lesson-progress");
    container.classList.remove("lesson-card--ui-lab", "lesson-card--ready-lesson");
    backButton.textContent = previousChrome.backText;
    if (previousChrome.backLabel === null) backButton.removeAttribute("aria-label");
    else backButton.setAttribute("aria-label", previousChrome.backLabel);
    lessonStatus.hidden = previousChrome.statusHidden;
    ["aria-valuemin", "aria-valuemax", "aria-valuenow"].forEach((name) => topProgress.removeAttribute(name));
    if (previousChrome.progressRole === null) topProgress.removeAttribute("role"); else topProgress.setAttribute("role", previousChrome.progressRole);
    if (previousChrome.progressLabel === null) topProgress.removeAttribute("aria-label"); else topProgress.setAttribute("aria-label", previousChrome.progressLabel);
  };
}

function renderAuthoredInteractiveLesson(container, day, lesson, authoredSteps, { progress, onProgress }) {
  const controller = new AbortController();
  const { signal } = controller;
  const shell = container.closest(".lesson-shell") || container;
  const backButton = shell.querySelector(".lesson-back");
  const topProgress = shell.querySelector(".lesson-top-title");
  const lessonStatus = shell.querySelector(".lesson-status");
  const previousChrome = {
    backText:backButton?.textContent,
    backLabel:backButton?.getAttribute("aria-label"),
    statusHidden:lessonStatus?.hidden,
    progressRole:topProgress?.getAttribute("role"),
    progressLabel:topProgress?.getAttribute("aria-label"),
  };
  const stepIds = new Set(authoredSteps.map((step) => step.id));
  const completed = new Set((progress?.completedStepIds || []).filter((id) => stepIds.has(id)));
  let currentIndex = Math.max(0, authoredSteps.findIndex((step) => !completed.has(step.id)));
  let resultVisible = Boolean(progress?.completedAt) && authoredSteps.every((step) => completed.has(step.id));
  let destroyStep = () => {};

  document.body.classList.add("ui-lab-open", "ui-lab-template-open", "ready-lesson-open");
  shell.classList.add("lesson-shell--ui-lab", "lesson-shell--ready-lesson");
  container.classList.add("lesson-card--ui-lab", "lesson-card--ready-lesson");
  backButton.textContent = "×";
  backButton.setAttribute("aria-label", "Close lesson");
  lessonStatus.hidden = true;
  topProgress.setAttribute("role", "progressbar");
  topProgress.setAttribute("aria-label", `${lesson.title} progress`);
  topProgress.setAttribute("aria-valuemin", "0");
  topProgress.setAttribute("aria-valuemax", String(authoredSteps.length));

  const announce = (isComplete = false) => onProgress?.({ completedStepIds:[...completed], isComplete });
  const focusHost = () => window.requestAnimationFrame(() => {
    if (document.body.classList.contains("lesson-markdown-source-open")) return;
    container.querySelector("[data-live-authored-step]")?.focus({ preventScroll:true });
  });
  const updateProgress = () => {
    const value = resultVisible ? authoredSteps.length : currentIndex + 1;
    topProgress.setAttribute("aria-valuenow", String(value));
    shell.style.setProperty("--lesson-progress", `${(value / authoredSteps.length) * 100}%`);
    document.body.classList.toggle("ui-lab-mcq-open", !resultVisible && authoredSteps[currentIndex]?.type === "mcq");
  };
  const renderResult = () => {
    resultVisible = true;
    authoredSteps.forEach((step) => completed.add(step.id));
    announce(true);
    destroyStep();
    destroyStep = () => {};
    container.innerHTML = `<article class="lesson-flow ready-lesson-flow"><section class="ready-lesson-stage" data-live-authored-step tabindex="-1">${renderTemplateShell({
      titleId:"authored-lesson-complete-title",
      content:`<div class="level-lesson-copy ready-lesson-result"><p class="level-layout-kicker">LESSON COMPLETE</p><h1 id="authored-lesson-complete-title">You completed Day ${day}</h1><p>You explained the system and completed every interactive checkpoint.</p><div class="lesson-result-score"><strong>DONE</strong><span>Lesson complete · +${XP_PER_LESSON} XP</span></div></div>`,
      footer:renderTemplateFooter({ backLabel:"REVIEW LESSON", backAttributes:{ "data-authored-review":true }, primaryLabel:"RESTART", primaryAttributes:{ "data-authored-restart":true } }),
      showScrollIndicator:false,
    })}</section></article>`;
    container.querySelector("[data-authored-review]").addEventListener("click", () => { resultVisible = false; currentIndex = 0; renderCurrent(); }, { signal });
    container.querySelector("[data-authored-restart]").addEventListener("click", () => { completed.clear(); resultVisible = false; currentIndex = 0; announce(false); renderCurrent(); }, { signal });
    updateProgress();
    focusHost();
  };
  const goBack = () => {
    if (currentIndex === 0) return;
    currentIndex -= 1;
    renderCurrent();
  };
  const goNext = () => {
    completed.add(authoredSteps[currentIndex].id);
    if (currentIndex === authoredSteps.length - 1) {
      renderResult();
      return;
    }
    announce(false);
    currentIndex += 1;
    renderCurrent();
  };
  const renderCurrent = () => {
    destroyStep();
    destroyStep = () => {};
    const step = authoredSteps[currentIndex];
    container.innerHTML = '<article class="lesson-flow ready-lesson-flow"><section class="ready-lesson-stage" data-live-authored-step tabindex="-1"></section></article>';
    const host = container.querySelector("[data-live-authored-step]");
    updateProgress();
    if (step.type === "markdown") {
      const stepController = new AbortController();
      const titleId = `authored-lesson-title-${step.id}`;
      host.innerHTML = renderTemplateShell({
        titleId,
        content:`<article class="level-lesson-copy ready-lesson-copy markdown-authored-content"><p class="level-layout-kicker">LEARN</p><div class="markdown-rendered">${renderMarkdownDocument(step.source)}</div></article>`,
        footer:renderTemplateFooter({ backAttributes:{ disabled:currentIndex === 0 }, primaryLabel:"CONTINUE" }),
      });
      const renderedHeading = host.querySelector(".markdown-rendered h1");
      if (renderedHeading) renderedHeading.id = titleId;
      else host.querySelector(".markdown-authored-content")?.insertAdjacentHTML("afterbegin", `<h1 class="visually-hidden" id="${escapeHtml(titleId)}">${escapeHtml(step.title)}</h1>`);
      mountMarkdownFeatures(host, { signal:stepController.signal, scrollSurface:host.querySelector(".level-layout-task") });
      host.querySelector("[data-template-back]").addEventListener("click", goBack, { signal:stepController.signal });
      host.querySelector("[data-template-primary]").addEventListener("click", goNext, { signal:stepController.signal });
      destroyStep = () => stepController.abort();
      focusHost();
      return;
    }
    if (step.type === "code-question") {
      let disposed = false;
      let destroyCode = () => {};
      host.classList.add("lesson-card--design-system", "lesson-card--ui-lab");
      host.innerHTML = '<div class="markdown-empty"><strong>Loading the code editor…</strong></div>';
      destroyStep = () => { disposed = true; destroyCode(); };
      void loadDesignSystem().then(({ renderDesignSystem }) => {
        if (disposed) return;
        destroyCode = renderDesignSystem(host, { practiceOnly:true, practice:step.content, embedded:true, onBack:goBack, onContinue:goNext });
        host.querySelector("[data-template-back]").disabled = currentIndex === 0;
        focusHost();
      }).catch((error) => {
        if (disposed) return;
        console.error("The lesson code editor could not load.", error);
        host.innerHTML = '<div class="markdown-empty markdown-empty--error" role="alert"><strong>The code editor could not load</strong></div>';
      });
      return;
    }
    destroyStep = renderUiLab(host, { definition:step, embedded:true, onBack:goBack, onContinue:goNext });
    host.querySelector("[data-template-back]").disabled = currentIndex === 0;
    focusHost();
  };

  if (resultVisible) renderResult(); else renderCurrent();
  return () => {
    destroyStep();
    controller.abort();
    document.body.classList.remove("ui-lab-open", "ui-lab-template-open", "ui-lab-mcq-open", "ready-lesson-open");
    shell.classList.remove("lesson-shell--ui-lab", "lesson-shell--ready-lesson");
    shell.style.removeProperty("--lesson-progress");
    container.classList.remove("lesson-card--ui-lab", "lesson-card--ready-lesson");
    backButton.textContent = previousChrome.backText;
    if (previousChrome.backLabel === null) backButton.removeAttribute("aria-label"); else backButton.setAttribute("aria-label", previousChrome.backLabel);
    lessonStatus.hidden = previousChrome.statusHidden;
    ["aria-valuemin", "aria-valuemax", "aria-valuenow"].forEach((name) => topProgress.removeAttribute(name));
    if (previousChrome.progressRole === null) topProgress.removeAttribute("role"); else topProgress.setAttribute("role", previousChrome.progressRole);
    if (previousChrome.progressLabel === null) topProgress.removeAttribute("aria-label"); else topProgress.setAttribute("aria-label", previousChrome.progressLabel);
  };
}

function renderMarkdownAuthoredLesson(container, day, lesson, options) {
  const controller = new AbortController();
  const { signal } = controller;
  const shell = container.closest(".lesson-shell") || container;
  const top = shell.querySelector(".lesson-top");
  const backButton = shell.querySelector(".lesson-back");
  const topProgress = shell.querySelector(".lesson-top-title");
  const lessonStatus = shell.querySelector(".lesson-status");
  const originalChrome = {
    backText:backButton?.textContent,
    backLabel:backButton?.getAttribute("aria-label"),
    statusHidden:lessonStatus?.hidden,
    progressRole:topProgress?.getAttribute("role"),
    progressLabel:topProgress?.getAttribute("aria-label"),
  };
  const toggle = document.createElement("button");
  toggle.className = "lesson-markdown-toggle";
  toggle.type = "button";
  toggle.textContent = "MARKDOWN";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "lesson-markdown-source");
  top?.insertBefore(toggle, lessonStatus || null);

  const sourcePanel = document.createElement("section");
  sourcePanel.className = "lesson-markdown-source";
  sourcePanel.id = "lesson-markdown-source";
  sourcePanel.hidden = true;
  sourcePanel.setAttribute("aria-labelledby", "lesson-markdown-source-title");
  sourcePanel.innerHTML = `<header><div><span>LIVE LESSON SOURCE</span><h2 id="lesson-markdown-source-title">Lesson 1 Markdown</h2></div><button type="button" data-close-lesson-markdown aria-label="Close Markdown source">×</button></header><p>Everything rendered in this lesson comes from this source. Delete content and the rendered steps disappear immediately; reload the page to restore it.</p><textarea data-lesson-markdown-input aria-label="Lesson 1 Markdown source" spellcheck="false"></textarea><footer><span data-lesson-markdown-count></span><strong data-lesson-markdown-state role="status" aria-live="polite"></strong></footer>`;
  shell.append(sourcePanel);
  const input = sourcePanel.querySelector("[data-lesson-markdown-input]");
  const count = sourcePanel.querySelector("[data-lesson-markdown-count]");
  const state = sourcePanel.querySelector("[data-lesson-markdown-state]");
  input.value = lesson.authoringSource;
  let destroyFlow = () => {};
  let renderTimer = 0;
  let edited = false;

  const restoreChrome = () => {
    document.body.classList.remove("ui-lab-open", "ui-lab-template-open", "ui-lab-mcq-open", "ready-lesson-open");
    shell.classList.remove("lesson-shell--ui-lab", "lesson-shell--ready-lesson");
    shell.style.removeProperty("--lesson-progress");
    container.classList.remove("lesson-card--ui-lab", "lesson-card--ready-lesson");
    if (backButton) {
      backButton.textContent = originalChrome.backText;
      if (originalChrome.backLabel === null) backButton.removeAttribute("aria-label");
      else backButton.setAttribute("aria-label", originalChrome.backLabel);
    }
    if (lessonStatus) lessonStatus.hidden = originalChrome.statusHidden;
    if (topProgress) {
      ["aria-valuemin", "aria-valuemax", "aria-valuenow"].forEach((name) => topProgress.removeAttribute(name));
      if (originalChrome.progressRole === null) topProgress.removeAttribute("role"); else topProgress.setAttribute("role", originalChrome.progressRole);
      if (originalChrome.progressLabel === null) topProgress.removeAttribute("aria-label"); else topProgress.setAttribute("aria-label", originalChrome.progressLabel);
    }
  };

  const renderEmptySource = (issues) => {
    document.body.classList.add("ui-lab-open", "ui-lab-template-open", "ready-lesson-open");
    shell.classList.add("lesson-shell--ui-lab", "lesson-shell--ready-lesson");
    container.classList.add("lesson-card--ui-lab", "lesson-card--ready-lesson");
    backButton.textContent = "×";
    backButton.setAttribute("aria-label", "Close lesson");
    lessonStatus.hidden = true;
    topProgress.setAttribute("role", "progressbar");
    topProgress.setAttribute("aria-label", `${lesson.title} progress`);
    topProgress.setAttribute("aria-valuemin", "0");
    topProgress.setAttribute("aria-valuemax", "0");
    topProgress.setAttribute("aria-valuenow", "0");
    shell.style.setProperty("--lesson-progress", "0%");
    container.innerHTML = `<article class="lesson-flow ready-lesson-flow lesson-markdown-empty-flow">${renderTemplateShell({
      titleId:"lesson-markdown-empty-title",
      content:`<div class="level-lesson-copy ready-lesson-copy lesson-markdown-empty"><p class="level-layout-kicker">MARKDOWN LESSON</p><h1 id="lesson-markdown-empty-title">This lesson has no authored content</h1><p>Its locked shell is still here, but there are no Markdown steps to render.</p>${issues.length ? `<small>${escapeHtml(issues[0])}</small>` : ""}</div>`,
      footer:renderTemplateFooter({ backAttributes:{ disabled:true }, primaryLabel:"NO CONTENT", primaryAttributes:{ disabled:true } }),
      showScrollIndicator:false,
    })}</article>`;
  };

  const renderSource = () => {
    window.clearTimeout(renderTimer);
    destroyFlow();
    destroyFlow = () => {};
    restoreChrome();
    const source = input.value;
    const compiled = compileLessonMarkdown(source);
    count.textContent = `${source.length.toLocaleString()} CHARACTERS`;
    state.textContent = `${compiled.steps.length} ${compiled.steps.length === 1 ? "STEP" : "STEPS"}${compiled.issues.length ? ` · ${compiled.issues.length} ISSUES` : ""}`;
    if (compiled.steps.length === 0) {
      renderEmptySource(compiled.issues);
      return;
    }
    const runtimeOptions = edited
      ? { progress:{ completedStepIds:[], completedAt:null }, onProgress:() => {} }
      : options;
    destroyFlow = renderAuthoredInteractiveLesson(container, day, lesson, compiled.parsed.steps, runtimeOptions);
  };

  const setPanelOpen = (open) => {
    sourcePanel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("lesson-markdown-source-open", open);
    if (open) input.focus({ preventScroll:true });
    else toggle.focus({ preventScroll:true });
  };
  toggle.addEventListener("click", () => setPanelOpen(sourcePanel.hidden), { signal });
  sourcePanel.querySelector("[data-close-lesson-markdown]").addEventListener("click", () => setPanelOpen(false), { signal });
  input.addEventListener("input", () => {
    edited = true;
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(renderSource, 120);
  }, { signal });
  sourcePanel.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    setPanelOpen(false);
  }, { signal });
  renderSource();

  return () => {
    window.clearTimeout(renderTimer);
    destroyFlow();
    controller.abort();
    restoreChrome();
    document.body.classList.remove("lesson-markdown-source-open");
    toggle.remove();
    sourcePanel.remove();
  };
}

export function renderLesson(container, day, lesson, options = {}) {
  if (!lesson) {
    renderComingSoon(container, day);
    return { title:`Day ${day}: Coming Soon · Full-Stack Quest`, destroy:() => {} };
  }
  const destroy = lesson.authoringSource
    ? renderMarkdownAuthoredLesson(container, day, lesson, options)
    : renderInteractiveLesson(container, day, lesson, options);
  return { title:`Day ${day}: ${lesson.title} · Full-Stack Quest`, destroy };
}
