import { TOTAL_DAYS } from "../data/course.js";
import { toLocalDateKey } from "../data/progress-store.js";
import { getProgressionSummary, RANKS, XP_PER_LESSON } from "../domain/progression.js";
import { updateCourseMapProgress } from "./course-map.js";

function setProgress(progress, { label, maximum, value, percent, count }) {
  progress.setAttribute("aria-label", label);
  progress.setAttribute("aria-valuemax", String(maximum));
  progress.setAttribute("aria-valuenow", String(value));
  progress.querySelector("[data-progress-fill]").style.setProperty("--progress", `${Math.min(100, Math.max(0, percent))}%`);
  progress.querySelector("[data-progress-count]").textContent = count;
}

export function readProgression(progressStore, today = toLocalDateKey()) {
  return getProgressionSummary({
    completedLessonDays:progressStore.getCompletedLessonDays(),
    activityDates:progressStore.getActivity(),
    today,
  });
}

export function renderGameProgress(root, progressStore, today = toLocalDateKey()) {
  const summary = readProgression(progressStore, today);
  const { rank, nextRank, streak } = summary;
  const rankCard = root.querySelector("[data-rank-card]");
  rankCard.setAttribute("aria-label", `Rank ${rank.number} of ${RANKS.length}: ${rank.name}`);
  root.querySelector("[data-rank-number]").textContent = String(rank.number);
  root.querySelector("[data-rank-name]").textContent = `${rank.name} Rank`;
  root.querySelector("[data-rank-position]").textContent = `RANK ${rank.number} OF ${RANKS.length}`;
  const rankProgress = root.querySelector("[data-rank-progress]");
  setProgress(rankProgress, nextRank ? {
    label:`${summary.rankXp} of ${summary.rankXpTarget} XP toward ${nextRank.name} Rank`,
    maximum:summary.rankXpTarget,
    value:summary.rankXp,
    percent:summary.progressPercent,
    count:`${summary.rankXp}/${summary.rankXpTarget} XP`,
  } : {
    label:`Maximum rank reached with ${summary.totalXp} XP`,
    maximum:summary.totalXp,
    value:summary.totalXp,
    percent:100,
    count:`MAX · ${summary.totalXp} XP`,
  });

  const rankStatus = root.querySelector("[data-rank-status]");
  rankStatus.setAttribute("aria-label", `Rank ${rank.number} of ${RANKS.length}`);
  rankStatus.querySelector("[data-status-value]").textContent = String(rank.number);
  const streakStatus = root.querySelector("[data-streak-status]");
  streakStatus.setAttribute("aria-label", `${streak.current}-day streak`);
  streakStatus.querySelector("[data-status-value]").textContent = String(streak.current);

  setProgress(root.querySelector("[data-course-progress]"), {
    label:`${summary.completedLessonCount} of ${TOTAL_DAYS} lessons completed`,
    maximum:TOTAL_DAYS,
    value:summary.completedLessonCount,
    percent:(summary.completedLessonCount / TOTAL_DAYS) * 100,
    count:`${summary.completedLessonCount}/${TOTAL_DAYS}`,
  });
  root.querySelector("[data-course-total]").textContent = `${summary.completedLessonCount} DONE`;

  const streakTarget = 7;
  setProgress(root.querySelector("[data-streak-progress]"), {
    label:`Current daily streak: ${streak.current} days; longest streak: ${streak.longest} days`,
    maximum:streakTarget,
    value:Math.min(streak.current, streakTarget),
    percent:(Math.min(streak.current, streakTarget) / streakTarget) * 100,
    count:`${streak.current} ${streak.current === 1 ? "DAY" : "DAYS"}`,
  });
  root.querySelector("[data-streak-best]").textContent = `BEST ${streak.longest}`;

  const dailyTarget = XP_PER_LESSON;
  setProgress(root.querySelector("[data-daily-xp-progress]"), {
    label:`${summary.todayXp} XP earned today`,
    maximum:dailyTarget,
    value:Math.min(summary.todayXp, dailyTarget),
    percent:(Math.min(summary.todayXp, dailyTarget) / dailyTarget) * 100,
    count:`${summary.todayXp}/${dailyTarget}`,
  });
  root.querySelector("[data-daily-xp-total]").textContent = `${summary.todayXp} XP`;
  root.querySelector("[data-total-xp]").textContent = `${summary.totalXp} XP TOTAL`;
  return summary;
}

export function createProgressController({ root, courseContainer, progressStore, windowObject = window, documentObject = document }) {
  let dailyRefreshTimer;
  const refresh = () => {
    updateCourseMapProgress(courseContainer, progressStore.getCompletedLessonDays());
    return renderGameProgress(root, progressStore);
  };
  const scheduleDailyRefresh = () => {
    windowObject.clearTimeout(dailyRefreshTimer);
    const now = new Date();
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    dailyRefreshTimer = windowObject.setTimeout(() => {
      refresh();
      scheduleDailyRefresh();
    }, nextDay.getTime() - now.getTime() + 100);
  };
  const handleVisibility = () => { if (!documentObject.hidden) refresh(); };
  windowObject.addEventListener("focus", refresh);
  documentObject.addEventListener("visibilitychange", handleVisibility);
  refresh();
  scheduleDailyRefresh();
  return Object.freeze({
    refresh,
    saveLessonProgress(day, { completedStepIds, isComplete }) {
      const previous = progressStore.getLessonProgress(day);
      const completionTime = isComplete && !previous.completedAt ? new Date() : null;
      const saved = progressStore.saveLessonProgress(day, {
        completedStepIds,
        completedAt:completionTime?.toISOString() || previous.completedAt,
        activityDate:completionTime ? toLocalDateKey(completionTime) : null,
      });
      if (completionTime) refresh();
      return saved;
    },
    destroy() {
      windowObject.clearTimeout(dailyRefreshTimer);
      windowObject.removeEventListener("focus", refresh);
      documentObject.removeEventListener("visibilitychange", handleVisibility);
    },
  });
}
