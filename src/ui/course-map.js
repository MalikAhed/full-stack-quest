import { COURSE_WEEKS, DAYS_PER_WEEK, WEEK_THEMES } from "../data/course.js";
import { escapeHtml } from "../lib/dom.js";

function createDayButton(day, [left, top], isLaunchNexus) {
  const className = isLaunchNexus ? "level level--launch-nexus" : "level";
  return `<button class="${className}" type="button" data-day="${day}" aria-label="Day ${day}, in progress" style="left:${left}%;top:${top}%"><span class="level-day">${day}</span><span class="level-status">IN PROGRESS</span></button>`;
}

function imageLoadingAttributes(weekNumber) {
  if (weekNumber === 1) return 'loading="eager" fetchpriority="high"';
  return weekNumber === 2 ? 'loading="eager"' : 'loading="lazy" decoding="async"';
}

function createWeekCard(week, firstDay, weekNumber) {
  const cardLabel = escapeHtml(week.cardLabel);
  const progress = '<span class="unit-card-progress">0/7 COMPLETE</span>';
  return `<button class="unit-card unit-card--image" type="button" data-day="${firstDay}" data-card-label="${cardLabel}" aria-label="${cardLabel}, 0 of 7 lessons complete"><img class="unit-card-image" src="${escapeHtml(week.cardImage)}" width="${week.cardWidth || 1979}" height="${week.cardHeight || 794}" alt="" ${imageLoadingAttributes(weekNumber)} />${progress}</button>`;
}

function themeStyle(theme) {
  return Object.entries({
    "level-text": theme.text, "level-shadow": theme.shadow,
    "level-base": theme.base, "level-base-shadow": theme.baseShadow,
    "level-border": theme.border, "level-top": theme.top,
    "level-mid": theme.middle, "level-bottom": theme.bottom,
  }).map(([name, value]) => `--${name}:${value}`).join(";");
}

export function renderCourseMapMarkup() {
  return COURSE_WEEKS.map((week, weekIndex) => {
    const weekNumber = weekIndex + 1;
    const firstDay = weekIndex * DAYS_PER_WEEK + 1;
    const isLaunchNexus = weekNumber === COURSE_WEEKS.length;
    const days = week.positions.map((position, index) => createDayButton(firstDay + index, position, isLaunchNexus)).join("");
    return `<section class="course-unit" id="week-${weekNumber}" aria-label="Week ${weekNumber}" style="${themeStyle(WEEK_THEMES[weekIndex])}"><div class="level-path"><img class="biome-image" src="assets/biomes/${weekNumber}.webp" width="941" height="${week.biomeHeight || 1672}" alt="" ${imageLoadingAttributes(weekNumber)} />${createWeekCard(week, firstDay, weekNumber)}${days}</div></section>`;
  }).join("");
}

export function renderCourseMap(container) {
  container.innerHTML = renderCourseMapMarkup();
}

export function updateCourseMapProgress(container, completedLessonDays) {
  const completed = new Set(completedLessonDays);
  container.querySelectorAll(".level[data-day]").forEach((level) => {
    const day = Number(level.dataset.day);
    const isComplete = completed.has(day);
    level.classList.toggle("is-complete", isComplete);
    level.setAttribute("aria-label", `Day ${day}, ${isComplete ? "complete" : "in progress"}`);
    level.querySelector(".level-status").textContent = isComplete ? "COMPLETE" : "IN PROGRESS";
  });
  container.querySelectorAll(".course-unit").forEach((unit, weekIndex) => {
    const firstDay = weekIndex * DAYS_PER_WEEK + 1;
    const completeCount = Array.from({ length:DAYS_PER_WEEK }, (_, index) => firstDay + index)
      .filter((day) => completed.has(day)).length;
    const card = unit.querySelector(".unit-card");
    card.querySelector(".unit-card-progress").textContent = `${completeCount}/${DAYS_PER_WEEK} COMPLETE`;
    card.setAttribute("aria-label", `${card.dataset.cardLabel}, ${completeCount} of ${DAYS_PER_WEEK} lessons complete`);
  });
}
