import { escapeHtml, prefersReducedMotion } from "../../lib/dom.js";
import { renderLessonInline } from "../../markdown/renderer.js";
import { launchCelebration } from "../celebration.js";
import { renderShipReadyLevel } from "../ship-ready-level.js";

const CHECK_ACTION = Object.freeze({ CHECK:"check", RETRY:"retry", CONTINUE:"continue" });

function triggerPinata(signal) {
  launchCelebration({ className:"ui-lab-pinata", signal });
}

function setCheckAction(button, label, state, text, disabled = button.disabled) {
  button.dataset.actionState = state;
  button.disabled = disabled;
  label.textContent = text;
}

export function renderUiLab(container, { definition, embedded = false, onBack, onContinue } = {}) {
  const controller = new AbortController();
  const { signal } = controller;
  if (!definition?.type || !definition.content) throw new Error("A Ship Ready template definition is required.");
  const template = definition.type;
  const config = definition.content;
  const isMcq = template === "mcq";
  const isResponse = template === "response";
  const isSequence = template === "sequence";
  const isFillBlanks = template === "fill-blanks";
  const isSpotBug = template === "spot-bug";
  const typeClasses = [
    ["ui-lab-mcq-open", isMcq], ["ui-lab-response-open", isResponse],
    ["ui-lab-sequence-open", isSequence], ["ui-lab-fill-open", isFillBlanks],
    ["ui-lab-bug-open", isSpotBug],
  ];
  if (embedded) container.classList.add("ui-lab-template-open");
  else document.body.classList.add("ui-lab-open", "ui-lab-template-open");
  typeClasses.forEach(([className, active]) => (embedded ? container : document.body).classList.toggle(className, active));
  const backButton = embedded ? null : document.querySelector(".lesson-back");
  const lessonStatus = embedded ? null : document.querySelector(".lesson-status");
  const previousBackText = backButton?.textContent;
  const previousBackLabel = backButton?.getAttribute("aria-label");
  const previousStatusHtml = lessonStatus?.innerHTML;
  const previousStatusHidden = lessonStatus?.hidden;
  if (backButton) {
    backButton.textContent = "×";
    backButton.setAttribute("aria-label", "Close lesson");
  }
  const lives = Number.isInteger(definition.lives) && definition.lives > 0 ? definition.lives : 0;
  if (lessonStatus) lessonStatus.hidden = lives === 0;
  if (lives > 0 && lessonStatus) {
    lessonStatus.innerHTML = `<span class="lesson-lives" aria-label="${lives} ${lives === 1 ? "life" : "lives"}"><b>${lives}</b><svg viewBox="0 0 32 30" aria-hidden="true"><path class="lesson-heart-shape" d="M16 27.2C13.7 24.7 4 17.7 4 10.5 4 6.6 6.9 4 10.6 4c2.2 0 4.2 1.1 5.4 2.9C17.2 5.1 19.2 4 21.4 4 25.1 4 28 6.6 28 10.5c0 7.2-9.7 14.2-12 16.7Z"/><path class="lesson-heart-shine" d="M9.2 8.1c1.5-1.7 3.6-1.7 4.5-.7" fill="none" stroke="#ffb7bf" stroke-width="2.4" stroke-linecap="round"/></svg></span>`;
  }
  container.innerHTML = renderShipReadyLevel(definition);
  const closeTemplate = () => embedded ? onContinue?.() : document.querySelector(".lesson-back")?.click();
  container.querySelector("[data-template-back]").addEventListener("click", () => embedded ? onBack?.() : closeTemplate(), { signal });

  let reviewTimer = null;
  let typeTimer = null;
  let instructionOverflowObserver = null;
  let contentOverflowObserver = null;
  let resultAnimations = [];
  let reviewRequestController = null;

  container.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.repeat || event.isComposing || event.target.closest("button, input, textarea, a")) return;
    const enterAction = container.querySelector(".level-action--check:not(:disabled)");
    if (!enterAction) return;
    event.preventDefault();
    enterAction.click();
  }, { signal });

  const destroy = () => {
    window.clearTimeout(reviewTimer);
    window.clearInterval(typeTimer);
    reviewRequestController?.abort();
    resultAnimations.forEach((animation) => animation.cancel());
    resultAnimations = [];
    instructionOverflowObserver?.disconnect();
    contentOverflowObserver?.disconnect();
    controller.abort();
    document.querySelector(".ui-lab-pinata")?.remove();
    document.querySelector(".ui-lab-response-nudge")?.remove();
    document.querySelector(".ui-lab-response-dim")?.remove();
    document.body.classList.remove("response-nudge-open");
    document.body.classList.remove("response-reviewing", "response-reviewed", "response-result-transition", "review-pass", "review-correction", "review-unavailable");
    typeClasses.forEach(([className]) => (embedded ? container : document.body).classList.remove(className));
    if (embedded) container.classList.remove("ui-lab-template-open");
    else document.body.classList.remove("ui-lab-template-open", "ui-lab-open");
    if (backButton) {
      backButton.textContent = previousBackText;
      if (previousBackLabel === null) backButton.removeAttribute("aria-label");
      else backButton.setAttribute("aria-label", previousBackLabel);
    }
    if (lessonStatus) {
      lessonStatus.innerHTML = previousStatusHtml;
      lessonStatus.hidden = previousStatusHidden;
    }
  };
  const contentScrollSurface = container.querySelector(".level-layout-task");
  const contentScrollButton = container.querySelector("[data-content-scroll]");
  if (contentScrollButton) {
    const updateContentOverflow = () => {
      const hasOverflow = contentScrollSurface.scrollHeight > contentScrollSurface.clientHeight + 2;
      const hasMore = hasOverflow && contentScrollSurface.scrollTop + contentScrollSurface.clientHeight < contentScrollSurface.scrollHeight - 2;
      contentScrollSurface.classList.toggle("has-more-content", hasMore);
    };
    contentScrollButton.addEventListener("click", () => {
      contentScrollSurface.scrollBy({ top:Math.max(140, contentScrollSurface.clientHeight * .58), behavior:"smooth" });
    }, { signal });
    contentScrollSurface.addEventListener("scroll", updateContentOverflow, { signal, passive:true });
    contentOverflowObserver = new ResizeObserver(updateContentOverflow);
    contentOverflowObserver.observe(contentScrollSurface);
    [...contentScrollSurface.children].forEach((child) => contentOverflowObserver.observe(child));
    window.requestAnimationFrame(updateContentOverflow);
  }
  if (isResponse) {
    const response = container.querySelector("#ui-lab-response");
    const responseCount = container.querySelector("[data-response-count]");
    const responseFeedback = container.querySelector(".ui-lab-response-feedback");
    const submit = container.querySelector("[data-response-submit]");
    const submitLabel = container.querySelector("[data-response-submit-label]");
    const reviewMascot = container.querySelector("[data-review-mascot]");
    const reviewMessage = container.querySelector("[data-review-message]");
    const thinkingMascot = container.querySelector(".ui-lab-thinking-mascot");
    const instructionBrief = container.querySelector(".ui-lab-response-brief");
    const instructionScroll = container.querySelector("[data-instruction-scroll]");
    const responseLayout = container.querySelector("[data-response-layout]");
    const updateInstructionOverflow = () => {
      const hasOverflow = instructionBrief.scrollHeight > instructionBrief.clientHeight + 2;
      const hasMore = hasOverflow && instructionBrief.scrollTop + instructionBrief.clientHeight < instructionBrief.scrollHeight - 2;
      responseLayout.classList.toggle("has-more-instructions", hasMore);
    };
    instructionScroll.addEventListener("click", () => {
      instructionBrief.scrollBy({ top:Math.max(120, instructionBrief.clientHeight * .55), behavior:"smooth" });
    }, { signal });
    instructionBrief.addEventListener("scroll", updateInstructionOverflow, { signal, passive:true });
    instructionOverflowObserver = new ResizeObserver(updateInstructionOverflow);
    instructionOverflowObserver.observe(instructionBrief);
    [...instructionBrief.children].forEach((child) => instructionOverflowObserver.observe(child));
    window.requestAnimationFrame(updateInstructionOverflow);
    let reviewState = "editing";
    let reviewRequestId = 0;
    const requestExplanationReview = async (answer, requestController) => {
      try {
        const result = await fetch("/api/explain-review", {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body:JSON.stringify({
            route:definition.route,
            answer,
            ...(definition.route === "lesson-authoring-preview" ? { authoredReview:{
              title:config.title, prompt:config.prompt, rubric:config.rubric,
              maxLength:config.maxLength, passScore:config.review.passScore,
            } } : {}),
          }),
          signal:requestController.signal,
        });
        const payload = await result.json();
        if (payload.source === "unavailable" && typeof payload.feedback === "string" && payload.feedback.trim().length >= 12) {
          return { source:"unavailable", feedback:payload.feedback.trim() };
        }
        if (!result.ok || !Number.isInteger(payload.score) || payload.score < 0 || payload.score > 10 || typeof payload.feedback !== "string" || payload.feedback.trim().length < 12 || payload.feedback.length > 600 || payload.source !== "codex") {
          throw new Error("Review response was invalid.");
        }
        return { score:payload.score, passed:payload.score >= config.review.passScore, feedback:payload.feedback.trim(), source:payload.source };
      } catch (error) {
        if (error?.name === "AbortError") throw error;
        return {
          source:"unavailable",
          feedback:"The lesson server could not reach Codex. Confirm the server is running and the Codex CLI is connected, then try again.",
        };
      }
    };
    const animateResultLayout = (element, previousRect, { duration = 660, delay = 0, fadeIn = false } = {}) => {
      if (prefersReducedMotion()) return;
      const nextRect = element.getBoundingClientRect();
      if (!previousRect.width || !previousRect.height || !nextRect.width || !nextRect.height) return;
      const translateX = previousRect.left - nextRect.left;
      const translateY = previousRect.top - nextRect.top;
      const scaleX = previousRect.width / nextRect.width;
      const scaleY = previousRect.height / nextRect.height;
      const animation = element.animate([
        { opacity:fadeIn ? .08 : 1, transform:`translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`, transformOrigin:"top left" },
        { opacity:1, transform:"translate(0, 0) scale(1, 1)", transformOrigin:"top left" },
      ], {
        duration,
        delay,
        easing:"cubic-bezier(.2,.82,.22,1)",
        fill:"backwards",
      });
      resultAnimations.push(animation);
      animation.finished.then(() => {
        resultAnimations = resultAnimations.filter((activeAnimation) => activeAnimation !== animation);
      }, () => {
        resultAnimations = resultAnimations.filter((activeAnimation) => activeAnimation !== animation);
      });
    };
    const resetReview = () => {
      window.clearTimeout(reviewTimer);
      window.clearInterval(typeTimer);
      reviewRequestId += 1;
      reviewRequestController?.abort();
      reviewRequestController = null;
      resultAnimations.forEach((animation) => animation.cancel());
      resultAnimations = [];
      reviewState = "editing";
      document.body.classList.remove("response-reviewing", "response-reviewed", "response-result-transition", "review-pass", "review-correction", "review-unavailable");
      reviewMascot.hidden = true;
      reviewMessage.classList.remove("is-result-reveal", "is-review-exiting", "is-typing");
      response.readOnly = false;
      submit.disabled = false;
      submitLabel.textContent = "SUBMIT EXPLANATION";
      responseFeedback.textContent = "";
      response.focus();
    };
    response.addEventListener("input", () => {
      responseCount.textContent = response.value.length;
      responseFeedback.textContent = "";
      response.removeAttribute("aria-invalid");
      document.querySelector(".ui-lab-response-nudge")?.remove();
      document.querySelector(".ui-lab-response-dim")?.remove();
      document.body.classList.remove("response-nudge-open");
      if (reviewState !== "editing") resetReview();
      submitLabel.textContent = "SUBMIT EXPLANATION";
      submit.disabled = false;
    }, { signal });
    const submitResponse = async () => {
      if (reviewState === "unavailable") {
        resetReview();
        submitResponse();
        return;
      }
      if (reviewState === "correction") {
        resetReview();
        return;
      }
      if (reviewState === "pass") { closeTemplate(); return; }
      if (reviewState === "reviewing") return;
      if (!response.value.trim()) {
        document.querySelector(".ui-lab-response-nudge")?.remove();
        document.querySelector(".ui-lab-response-dim")?.remove();
        document.body.classList.add("response-nudge-open");
        const composer = container.querySelector(".ui-lab-composer");
        const composerRect = composer.getBoundingClientRect();
        const dim = document.createElement("div");
        dim.className = "ui-lab-response-dim";
        dim.setAttribute("aria-hidden", "true");
        document.body.append(dim);
        const nudge = document.createElement("div");
        nudge.className = "ui-lab-response-nudge";
        nudge.setAttribute("role", "status");
        nudge.innerHTML = `<img src="assets/mascots/chibi-placeholder.png" alt="" /><div class="ui-lab-response-bubble"><strong>${escapeHtml(config.guideTitle)}</strong><p>${escapeHtml(config.guide)}</p><button type="button" data-dismiss-response-guide>UNDERSTOOD</button></div>`;
        nudge.style.left = `${Math.min(window.innerWidth - 460, Math.max(20, composerRect.left - 72))}px`;
        nudge.style.top = `${Math.max(20, composerRect.top - 142)}px`;
        document.body.append(nudge);
        nudge.querySelector("[data-dismiss-response-guide]").addEventListener("click", () => {
          nudge.remove();
          dim.remove();
          document.body.classList.remove("response-nudge-open");
          response.focus();
        }, { signal, once:true });
        response.focus();
        return;
      }
      const answer = response.value.trim();
      const requestId = ++reviewRequestId;
      reviewRequestController?.abort();
      reviewRequestController = new AbortController();
      reviewState = "reviewing";
      response.readOnly = true;
      submit.disabled = true;
      submitLabel.textContent = "REVIEWING…";
      responseFeedback.textContent = "AI is rating your explanation.";
      reviewMascot.hidden = false;
      reviewMessage.classList.remove("is-result-reveal", "is-review-exiting", "is-typing");
      reviewMessage.innerHTML = `<div class="ui-lab-reviewing-label"><strong>AI is reviewing</strong><span class="ui-lab-review-loading" aria-hidden="true"><i></i><i></i><i></i></span></div>`;
      document.body.classList.add("response-reviewing");
      let result;
      try {
        result = await requestExplanationReview(answer, reviewRequestController);
      } catch (error) {
        if (error?.name === "AbortError") return;
        result = {
          source:"unavailable",
          feedback:"The lesson server could not reach Codex. Confirm the server is running and the Codex CLI is connected, then try again.",
        };
      }
      if (requestId !== reviewRequestId || reviewState !== "reviewing") return;
      reviewRequestController = null;
      reviewMessage.classList.add("is-review-exiting");
      reviewTimer = window.setTimeout(() => {
        const previousMessageRect = reviewMessage.getBoundingClientRect();
        const previousMascotRect = thinkingMascot.getBoundingClientRect();
        const previousAnswerRect = container.querySelector(".ui-lab-response-answer").getBoundingClientRect();
        const { score, passed, feedback:resultCopy, source } = result;
        const unavailable = source === "unavailable";
        reviewState = unavailable ? "unavailable" : (passed ? "pass" : "correction");
        document.body.classList.add("response-result-transition");
        document.body.classList.remove("response-reviewing");
        document.body.classList.add("response-reviewed", unavailable ? "review-unavailable" : (passed ? "review-pass" : "review-correction"));
        if (!unavailable && passed) triggerPinata(signal);
        responseFeedback.textContent = "";
        const resultTitle = unavailable ? "AI review unavailable" : `AI review · ${score}/10 · ${passed ? "Passed" : "Needs correction"}`;
        reviewMessage.className = "ui-lab-review-message is-result-reveal is-typing";
        reviewMessage.dataset.reviewSource = source;
        reviewMessage.innerHTML = `<strong>${escapeHtml(resultTitle)}</strong><p aria-hidden="true"></p><span class="visually-hidden">${escapeHtml(resultCopy)}</span>`;
        responseLayout.getBoundingClientRect();
        animateResultLayout(thinkingMascot, previousMascotRect, { duration:720 });
        animateResultLayout(reviewMessage, previousMessageRect, { duration:700, delay:40, fadeIn:true });
        animateResultLayout(container.querySelector(".ui-lab-response-answer"), previousAnswerRect, { duration:620, delay:30 });
        document.body.classList.remove("response-result-transition");
        const typedCopy = reviewMessage.querySelector("p");
        let characterIndex = 0;
        const charactersPerTick = Math.max(1, Math.ceil(resultCopy.length / 32));
        typeTimer = window.setTimeout(() => {
          typeTimer = window.setInterval(() => {
            characterIndex += charactersPerTick;
            typedCopy.textContent = resultCopy.slice(0, characterIndex);
            if (characterIndex >= resultCopy.length) {
              window.clearInterval(typeTimer);
              reviewMessage.classList.remove("is-typing");
            }
          }, 12);
        }, 80);
        submit.disabled = false;
        submitLabel.textContent = unavailable ? "TRY AGAIN" : (passed ? "CONTINUE" : "REVISE ANSWER");
      }, 120);
    };
    submit.addEventListener("click", submitResponse, { signal });
    response.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
      event.preventDefault();
      submitResponse();
    }, { signal });
    return destroy;
  }
  if (isSpotBug) {
    const lines = [...container.querySelectorAll("[data-bug-line]")];
    const reasonsPanel = container.querySelector("[data-bug-reasons]");
    const reasons = [...container.querySelectorAll("[data-bug-reason]")];
    const feedback = container.querySelector("[data-bug-feedback]");
    const checkButton = container.querySelector("[data-bug-check]");
    const checkLabel = container.querySelector("[data-bug-check-label]");
    let selectedLine = null;
    let selectedReason = null;
    setCheckAction(checkButton, checkLabel, CHECK_ACTION.CHECK, "CHECK ANSWER", true);
    lines.forEach((line) => line.addEventListener("click", () => {
      selectedLine = line.dataset.bugLine;
      selectedReason = null;
      lines.forEach((candidate) => {
        const selected = candidate === line;
        candidate.classList.toggle("is-selected", selected);
        candidate.setAttribute("aria-pressed", String(selected));
        candidate.classList.remove("is-correct", "is-wrong");
      });
      reasons.forEach((reason) => {
        reason.classList.remove("is-selected", "is-correct", "is-wrong");
        reason.setAttribute("aria-pressed", "false");
      });
      reasonsPanel.hidden = false;
      reasonsPanel.classList.add("is-visible");
      window.requestAnimationFrame(() => {
        reasonsPanel.scrollIntoView({
          behavior:prefersReducedMotion() ? "auto" : "smooth",
          block:"start",
          inline:"nearest",
        });
      });
      feedback.className = "level-feedback";
      feedback.textContent = "Line selected. Now choose why it is wrong.";
      setCheckAction(checkButton, checkLabel, CHECK_ACTION.CHECK, "CHECK ANSWER", true);
    }, { signal }));
    reasons.forEach((reason) => reason.addEventListener("click", () => {
      selectedReason = reason.dataset.bugReason;
      reasons.forEach((candidate) => {
        const selected = candidate === reason;
        candidate.classList.toggle("is-selected", selected);
        candidate.setAttribute("aria-pressed", String(selected));
        candidate.classList.remove("is-correct", "is-wrong");
      });
      feedback.textContent = "Reason selected. Check your answer.";
      setCheckAction(checkButton, checkLabel, CHECK_ACTION.CHECK, "CHECK ANSWER", false);
    }, { signal }));
    checkButton.addEventListener("click", () => {
      if (checkButton.dataset.actionState === CHECK_ACTION.CONTINUE) { closeTemplate(); return; }
      if (checkButton.dataset.actionState === CHECK_ACTION.RETRY) {
        selectedLine = null; selectedReason = null;
        [...lines, ...reasons].forEach((choice) => { choice.classList.remove("is-selected", "is-correct", "is-wrong"); choice.setAttribute("aria-pressed", "false"); });
        reasonsPanel.hidden = true; reasonsPanel.classList.remove("is-visible");
        feedback.className = "level-feedback"; feedback.textContent = "Select the line that contains the bug.";
        setCheckAction(checkButton, checkLabel, CHECK_ACTION.CHECK, "CHECK ANSWER", true);
        return;
      }
      if (!selectedLine || !selectedReason) return;
      const correct = selectedLine === String(config.correctLine) && selectedReason === config.correctReason;
      const selectedLineButton = lines.find((line) => line.dataset.bugLine === selectedLine);
      const selectedReasonButton = reasons.find((reason) => reason.dataset.bugReason === selectedReason);
      selectedLineButton.classList.add(correct ? "is-correct" : "is-wrong");
      selectedReasonButton.classList.add(correct ? "is-correct" : "is-wrong");
      feedback.className = `level-feedback ${correct ? "is-correct" : "is-wrong"}`;
      feedback.innerHTML = correct
        ? `<span class="level-result-copy"><strong>Bug found!</strong><span>${renderLessonInline(config.correctFeedback)}</span></span>`
        : `<span class="level-result-copy"><strong>Not quite</strong><span>${renderLessonInline(config.wrongFeedback)}</span></span>`;
      setCheckAction(checkButton, checkLabel, correct ? CHECK_ACTION.CONTINUE : CHECK_ACTION.RETRY, correct ? "CONTINUE" : "TRY AGAIN");
      if (correct) triggerPinata(signal);
    }, { signal });
    return destroy;
  }
  if (isFillBlanks) {
    const blanks = [...container.querySelectorAll("[data-fill-blank]")];
    const options = [...container.querySelectorAll("[data-fill-option]")];
    const feedback = container.querySelector("[data-fill-feedback]");
    const checkButton = container.querySelector("[data-fill-check]");
    const checkLabel = container.querySelector("[data-fill-check-label]");
    const answers = Array(blanks.length).fill(null);
    const expected = config.expected;
    const placements = new Map();
    setCheckAction(checkButton, checkLabel, CHECK_ACTION.CHECK, "CHECK ANSWER", true);
    const animateMove = (option, sourceRect) => {
      if (prefersReducedMotion()) return;
      const targetRect = option.getBoundingClientRect();
      const animation = option.animate([
        { transform:`translate(${sourceRect.left - targetRect.left}px, ${sourceRect.top - targetRect.top}px) scale(${sourceRect.width / targetRect.width}, ${sourceRect.height / targetRect.height})` },
        { transform:"translate(0, 0) scale(1)" },
      ], { duration:420, easing:"cubic-bezier(.2,.85,.25,1)" });
      animation.finished.catch(() => {});
    };
    const updateFillState = () => {
      const nextIndex = answers.findIndex((answer) => answer === null);
      blanks.forEach((blank, index) => blank.classList.toggle("is-active", index === nextIndex));
      checkButton.disabled = nextIndex !== -1;
      if (nextIndex === -1) feedback.textContent = "Both blanks are filled. Check your answer.";
      else feedback.textContent = `Choose an option for blank ${nextIndex + 1}.`;
    };
    options.forEach((option) => option.addEventListener("click", () => {
      setCheckAction(checkButton, checkLabel, CHECK_ACTION.CHECK, "CHECK ANSWER");
      const placement = placements.get(option);
      if (placement) {
        const sourceRect = option.getBoundingClientRect();
        placement.placeholder.replaceWith(option);
        answers[placement.blankIndex] = null;
        placements.delete(option);
        option.classList.remove("is-fill-token");
        option.removeAttribute("aria-label");
        option.setAttribute("aria-pressed", "false");
        placement.blank.classList.remove("is-filled", "is-correct", "is-wrong");
        feedback.className = "level-feedback";
        updateFillState();
        animateMove(option, sourceRect);
        return;
      }
      const blankIndex = answers.findIndex((answer) => answer === null);
      if (blankIndex === -1) return;
      const blank = blanks[blankIndex];
      const value = option.dataset.fillOption;
      const sourceRect = option.getBoundingClientRect();
      const optionPlaceholder = document.createElement("div");
      optionPlaceholder.className = "ui-lab-fill-option-placeholder";
      optionPlaceholder.setAttribute("aria-hidden", "true");
      option.before(optionPlaceholder);
      answers[blankIndex] = value;
      placements.set(option, { blank, blankIndex, placeholder:optionPlaceholder });
      option.classList.add("is-fill-token");
      option.setAttribute("aria-label", `Return ${value} to the options`);
      option.setAttribute("aria-pressed", "true");
      blank.append(option);
      blank.classList.remove("is-active");
      blank.classList.add("is-filled");
      updateFillState();
      animateMove(option, sourceRect);
    }, { signal }));
    checkButton.addEventListener("click", () => {
      if (checkButton.dataset.actionState === CHECK_ACTION.CONTINUE) { closeTemplate(); return; }
      if (checkButton.dataset.actionState === CHECK_ACTION.RETRY) {
        [...placements.entries()].forEach(([option, placement]) => { placement.placeholder.replaceWith(option); option.classList.remove("is-fill-token"); option.removeAttribute("aria-label"); option.setAttribute("aria-pressed", "false"); });
        placements.clear(); answers.fill(null); blanks.forEach((blank) => { blank.replaceChildren(); blank.classList.remove("is-filled", "is-correct", "is-wrong"); });
        feedback.className = "level-feedback";
        setCheckAction(checkButton, checkLabel, CHECK_ACTION.CHECK, "CHECK ANSWER");
        updateFillState();
        return;
      }
      if (answers.some((answer) => answer === null)) return;
      const correct = expected.every((answer, index) => answer === answers[index]);
      blanks.forEach((blank, index) => blank.classList.add(answers[index] === expected[index] ? "is-correct" : "is-wrong"));
      feedback.className = `level-feedback ${correct ? "is-correct" : "is-wrong"}`;
      feedback.innerHTML = correct
        ? `<span class="level-result-copy"><strong>Correct!</strong><span>${renderLessonInline(config.correctFeedback)}</span></span>`
        : `<span class="level-result-copy"><strong>Not quite</strong><span>${renderLessonInline(config.wrongFeedback)}</span></span>`;
      setCheckAction(checkButton, checkLabel, correct ? CHECK_ACTION.CONTINUE : CHECK_ACTION.RETRY, correct ? "CONTINUE" : "TRY AGAIN");
      if (correct) triggerPinata(signal);
    }, { signal });
    return destroy;
  }
  if (isSequence) {
    const slots = [...container.querySelectorAll("[data-sequence-slot]")];
    const steps = [...container.querySelectorAll("[data-sequence-step]")];
    const checkButton = container.querySelector("[data-sequence-check]");
    const checkLabel = container.querySelector("[data-sequence-check-label]");
    const feedback = container.querySelector("[data-sequence-feedback]");
    const chosen = [];
    const placements = new Map();
    const stepText = Object.fromEntries(steps.map((step) => [step.dataset.sequenceStep, step.querySelector("b").textContent]));
    const expected = config.expected;
    setCheckAction(checkButton, checkLabel, CHECK_ACTION.CHECK, "CHECK ORDER", true);
    const refresh = () => {
      slots.forEach((slot, index) => {
        const value = chosen[index];
        const placedStep = slot.querySelector("[data-sequence-step]");
        slot.classList.toggle("is-filled", Boolean(value));
        if (!placedStep) slot.querySelector("b").textContent = value ? stepText[value] : config.placeholder;
      });
      checkButton.disabled = chosen.length !== expected.length;
      feedback.className = "level-feedback";
      feedback.textContent = chosen.length === expected.length ? "Ready to check your program flow." : `Choose ${expected.length - chosen.length} more ${expected.length - chosen.length === 1 ? "step" : "steps"}.`;
    };
    steps.forEach((step) => step.addEventListener("click", () => {
      if (step.disabled || chosen.length === expected.length) return;
      const targetSlot = slots[chosen.length];
      const sourceRect = step.getBoundingClientRect();
      const slotNumber = targetSlot.querySelector("span");
      const bankPlaceholder = document.createElement("div");
      bankPlaceholder.className = "ui-lab-sequence-bank-placeholder";
      bankPlaceholder.setAttribute("aria-hidden", "true");
      bankPlaceholder.style.minHeight = `${sourceRect.height}px`;
      step.before(bankPlaceholder);
      placements.set(step, bankPlaceholder);
      chosen.push(step.dataset.sequenceStep);
      step.disabled = true;
      step.classList.add("is-placed");
      targetSlot.replaceChildren(slotNumber, step);
      setCheckAction(checkButton, checkLabel, CHECK_ACTION.CHECK, "CHECK ORDER");
      refresh();
      if (!prefersReducedMotion()) {
        const targetRect = step.getBoundingClientRect();
        const animation = step.animate([
          { transform:`translate(${sourceRect.left - targetRect.left}px, ${sourceRect.top - targetRect.top}px)` },
          { transform:"translate(0, 0)" },
        ], { duration:420, easing:"cubic-bezier(.2,.85,.25,1)" });
        animation.finished.catch(() => {});
      }
    }, { signal }));
    checkButton.addEventListener("click", () => {
      if (checkButton.dataset.actionState === CHECK_ACTION.CONTINUE) { closeTemplate(); return; }
      if (checkButton.dataset.actionState === CHECK_ACTION.RETRY) {
        placements.forEach((placeholder, step) => { placeholder.replaceWith(step); step.disabled = false; step.classList.remove("is-placed"); });
        placements.clear(); chosen.length = 0;
        slots.forEach((slot, index) => { const number = slot.querySelector("span"); slot.replaceChildren(number, Object.assign(document.createElement("b"), { textContent:config.placeholder })); slot.classList.remove("is-filled"); });
        setCheckAction(checkButton, checkLabel, CHECK_ACTION.CHECK, "CHECK ORDER");
        refresh();
        return;
      }
      if (chosen.length !== expected.length) return;
      const correct = expected.every((step, index) => step === chosen[index]);
      feedback.className = `level-feedback ${correct ? "is-correct" : "is-wrong"}`;
      feedback.innerHTML = correct
        ? `<span class="level-result-copy"><strong>That’s the path!</strong><span>${escapeHtml(config.correctFeedback)}</span></span>`
        : `<span class="level-result-copy"><strong>Almost there</strong><span>${escapeHtml(config.wrongFeedback)}</span></span>`;
      setCheckAction(checkButton, checkLabel, correct ? CHECK_ACTION.CONTINUE : CHECK_ACTION.RETRY, correct ? "CONTINUE" : "TRY AGAIN");
      if (correct) triggerPinata(signal);
    }, { signal });
    refresh();
    return destroy;
  }
  if (!isMcq) {
    container.querySelector("[data-template-primary]").addEventListener("click", closeTemplate, { signal });
    return destroy;
  }

  const answers = [...container.querySelectorAll("[data-ui-lab-answer]")];
  const checkButton = container.querySelector("[data-ui-lab-check]");
  const feedback = container.querySelector("[data-ui-lab-feedback]");
  const checkLabel = checkButton.querySelector("[data-ui-lab-check-label]");
  let selectedAnswer = null;
  setCheckAction(checkButton, checkLabel, CHECK_ACTION.CHECK, "CHECK ANSWER", true);

  answers.forEach((answer) => answer.addEventListener("click", () => {
    selectedAnswer = answer;
    answers.forEach((option) => {
      option.classList.toggle("is-selected", option === answer);
      option.classList.remove("is-correct", "is-wrong");
      option.setAttribute("aria-pressed", String(option === answer));
    });
    feedback.className = "level-feedback";
    feedback.textContent = config.selectedFeedback;
    setCheckAction(checkButton, checkLabel, CHECK_ACTION.CHECK, "CHECK ANSWER", false);
  }, { signal }));

  checkButton.addEventListener("click", () => {
    if (checkButton.dataset.actionState === CHECK_ACTION.CONTINUE) { closeTemplate(); return; }
    if (checkButton.dataset.actionState === CHECK_ACTION.RETRY) {
      selectedAnswer = null;
      answers.forEach((answer) => { answer.classList.remove("is-selected", "is-correct", "is-wrong"); answer.setAttribute("aria-pressed", "false"); });
      feedback.className = "level-feedback"; feedback.textContent = config.idleFeedback;
      setCheckAction(checkButton, checkLabel, CHECK_ACTION.CHECK, "CHECK ANSWER", true);
      return;
    }
    if (!selectedAnswer) return;
    const isCorrect = selectedAnswer.dataset.correct === "true";
    selectedAnswer.classList.add(isCorrect ? "is-correct" : "is-wrong");
    feedback.className = `level-feedback ${isCorrect ? "is-correct" : "is-wrong"}`;
    feedback.innerHTML = isCorrect
      ? `<span class="level-result-icon level-result-icon--correct"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="m10.5 20.8 6.2 6.2 13-14"/></svg></span><span class="level-result-copy"><strong>Correct!</strong><span>${renderLessonInline(config.correctFeedback)}</span></span>`
      : `<span class="level-result-icon level-result-icon--wrong"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="m12.5 12.5 15 15m0-15-15 15"/></svg></span><span class="level-result-copy"><strong>Not quite</strong><span>${renderLessonInline(config.wrongFeedback)}</span></span>`;
    setCheckAction(checkButton, checkLabel, isCorrect ? CHECK_ACTION.CONTINUE : CHECK_ACTION.RETRY, isCorrect ? "CONTINUE" : "TRY AGAIN");
    if (isCorrect) triggerPinata(signal);
  }, { signal });

  return destroy;
}
