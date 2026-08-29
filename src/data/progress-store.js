export const PROGRESS_STORAGE_KEY = "full-stack-quest:progress";
export const PROGRESS_VERSION = 2;
const defaultErrorReporter = (error) => console.warn(error);

function createEmptyState() {
  return { version:PROGRESS_VERSION, lessons:{}, activity:[] };
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeLessonProgress(value) {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.completedStepIds) || value.completedStepIds.some((id) => typeof id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))) {
    return null;
  }
  if (value.completedAt !== null && value.completedAt !== undefined
    && (typeof value.completedAt !== "string" || Number.isNaN(Date.parse(value.completedAt)))) {
    return null;
  }
  return {
    completedStepIds:[...new Set(value.completedStepIds)],
    completedAt:value.completedAt ?? null,
  };
}

function isDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function toLocalDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError("value must be a valid date");
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeActivity(value) {
  if (!Array.isArray(value)) return null;
  const activity = [];
  const seenDays = new Set();
  for (const entry of value) {
    if (!isRecord(entry) || !Number.isInteger(entry.day) || entry.day < 1 || !isDateKey(entry.date) || seenDays.has(entry.day)) return null;
    seenDays.add(entry.day);
    activity.push({ day:entry.day, date:entry.date });
  }
  return activity.sort((a, b) => a.date.localeCompare(b.date) || a.day - b.day);
}

function normalizeState(value) {
  if (!isRecord(value) || !isRecord(value.lessons)) return null;
  const lessons = {};
  for (const [day, progress] of Object.entries(value.lessons)) {
    if (!/^\d+$/.test(day)) return null;
    const normalized = normalizeLessonProgress(progress);
    if (!normalized) return null;
    lessons[day] = normalized;
  }
  if (value.version === 1) {
    const activity = Object.entries(lessons)
      .filter(([, progress]) => progress.completedAt)
      .map(([day, progress]) => ({ day:Number(day), date:toLocalDateKey(progress.completedAt) }));
    return { version:PROGRESS_VERSION, lessons, activity };
  }
  if (value.version !== PROGRESS_VERSION) return null;
  const activity = normalizeActivity(value.activity);
  if (!activity) return null;
  const completedDays = Object.entries(lessons)
    .filter(([, progress]) => Boolean(progress.completedAt))
    .map(([day]) => Number(day));
  if (activity.length !== completedDays.length || activity.some(({ day }) => !lessons[String(day)]?.completedAt)) return null;
  return { version:PROGRESS_VERSION, lessons, activity };
}

function reportStorageError(onError, message, cause) {
  const error = new Error(message, { cause });
  onError(error);
}

export function getBrowserStorage(onError = defaultErrorReporter) {
  try {
    return window.localStorage;
  } catch (error) {
    reportStorageError(onError, "Lesson progress storage is unavailable; progress will last only for this page view.", error);
    return null;
  }
}

export function createProgressStore({ storage = null, onError = defaultErrorReporter } = {}) {
  let state = createEmptyState();

  if (storage) {
    try {
      const serialized = storage.getItem(PROGRESS_STORAGE_KEY);
      if (serialized) {
        const normalized = normalizeState(JSON.parse(serialized));
        if (normalized) state = normalized;
        else reportStorageError(onError, "Saved lesson progress is invalid or from an unsupported version; a safe empty state is being used.");
      }
    } catch (error) {
      reportStorageError(onError, "Saved lesson progress could not be read; a safe empty state is being used.", error);
    }
  }

  const persist = () => {
    if (!storage) return;
    try {
      storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      reportStorageError(onError, "Lesson progress could not be saved.", error);
    }
  };

  return Object.freeze({
    getLessonProgress(day) {
      if (!Number.isInteger(day) || day < 1) return { completedStepIds:[], completedAt:null };
      const saved = state.lessons[String(day)];
      return saved
        ? { completedStepIds:[...saved.completedStepIds], completedAt:saved.completedAt }
        : { completedStepIds:[], completedAt:null };
    },

    getCompletedLessonDays() {
      return Object.entries(state.lessons)
        .filter(([, progress]) => Boolean(progress.completedAt))
        .map(([day]) => Number(day))
        .sort((a, b) => a - b);
    },

    getActivity() {
      return state.activity.map((entry) => ({ ...entry }));
    },

    saveLessonProgress(day, { completedStepIds, completedAt = null, activityDate = null }) {
      if (!Number.isInteger(day) || day < 1) throw new TypeError("day must be a positive integer");
      const normalized = normalizeLessonProgress({ completedStepIds, completedAt });
      if (!normalized) throw new TypeError("lesson progress is invalid");
      if (activityDate !== null && !isDateKey(activityDate)) throw new TypeError("activityDate must be a valid YYYY-MM-DD date");
      const previous = state.lessons[String(day)];
      const firstCompletion = !previous?.completedAt && Boolean(normalized.completedAt);
      const savedProgress = { ...normalized, completedAt:previous?.completedAt || normalized.completedAt };
      const activity = firstCompletion
        ? [...state.activity, { day, date:activityDate || toLocalDateKey(savedProgress.completedAt) }]
          .sort((a, b) => a.date.localeCompare(b.date) || a.day - b.day)
        : state.activity;
      state = {
        ...state,
        lessons:{ ...state.lessons, [String(day)]:savedProgress },
        activity,
      };
      persist();
      return { completedStepIds:[...savedProgress.completedStepIds], completedAt:savedProgress.completedAt };
    },
  });
}
