import { TOTAL_DAYS } from "../course.js";
import { defineLesson } from "../../domain/lesson.js";
import { lessonRegistry } from "./lesson-registry.js";

export function createLessonLoader({ registry = lessonRegistry, totalDays = TOTAL_DAYS } = {}) {
  const lessonCache = new Map();

  return async function loadRegisteredLesson(day) {
    if (!Number.isInteger(day) || day < 1 || day > totalDays) return null;
    if (lessonCache.has(day)) return lessonCache.get(day);

    const load = registry.get(day);
    if (!load) return null;

    const pendingLesson = Promise.resolve()
      .then(() => load())
      .then(({ default:lesson }) => defineLesson(lesson, { day }));
    lessonCache.set(day, pendingLesson);

    try {
      const lesson = await pendingLesson;
      lessonCache.set(day, lesson);
      return lesson;
    } catch (error) {
      lessonCache.delete(day);
      throw error;
    }
  };
}

export const loadLesson = createLessonLoader();
