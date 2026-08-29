/**
 * Add reviewed runtime candidates or published lessons here. Keeping each lesson behind an import function means
 * the browser downloads lesson content only when a learner opens that day.
 *
 * Example:
 * [1, () => import("./candidates/day-001.js")],
 *
 * Each lesson module default-exports a lesson created with defineLesson(). The
 * stable model is { title, summary, steps: [{ id, type, title, body, ... }] }.
 * Step ids are persisted, so never reuse or casually rename a published id.
 */
export const lessonRegistry = new Map([
  [1, () => import("./candidates/day-001.js")],
  [2, () => import("./candidates/day-002.js")],
  [3, () => import("./candidates/day-003.js")],
  [4, () => import("./candidates/day-004.js")],
  [5, () => import("./candidates/day-005.js")],
  [6, () => import("./candidates/day-006.js")],
  [7, () => import("./candidates/day-007.js")],
]);
