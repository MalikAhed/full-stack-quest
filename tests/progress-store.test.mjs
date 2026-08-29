import assert from "node:assert/strict";
import test from "node:test";
import { createProgressStore, PROGRESS_STORAGE_KEY, PROGRESS_VERSION } from "../src/data/progress-store.js";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

test("progress store persists stable step ids without reward authority", () => {
  const storage = new MemoryStorage();
  const store = createProgressStore({ storage });
  store.saveLessonProgress(3, {
    completedStepIds:["semantic-elements", "semantic-elements", "document-outline"],
    completedAt:"2026-08-03T12:00:00.000Z",
  });
  assert.deepEqual(store.getLessonProgress(3), {
    completedStepIds:["semantic-elements", "document-outline"],
    completedAt:"2026-08-03T12:00:00.000Z",
  });
  const saved = JSON.parse(storage.getItem(PROGRESS_STORAGE_KEY));
  assert.equal(saved.version, PROGRESS_VERSION);
  assert.equal("reward" in saved.lessons[3], false);
  assert.deepEqual(saved.activity, [{ day:3, date:"2026-08-03" }]);
});

test("a lesson completion records one daily activity and cannot award progress twice", () => {
  const storage = new MemoryStorage();
  const store = createProgressStore({ storage });
  const completion = { completedStepIds:["first-step"], completedAt:"2026-08-10T10:00:00.000Z", activityDate:"2026-08-10" };
  store.saveLessonProgress(1, completion);
  store.saveLessonProgress(1, { ...completion, completedAt:"2026-08-11T10:00:00.000Z", activityDate:"2026-08-11" });
  assert.deepEqual(store.getCompletedLessonDays(), [1]);
  assert.deepEqual(store.getActivity(), [{ day:1, date:"2026-08-10" }]);
  assert.equal(store.getLessonProgress(1).completedAt, completion.completedAt);
});

test("version 1 lesson completion data migrates into the daily activity model", () => {
  const storage = new MemoryStorage();
  storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({
    version:1,
    lessons:{ 4:{ completedStepIds:["first-step"], completedAt:"2026-08-03T12:00:00.000Z" } },
  }));
  const store = createProgressStore({ storage });
  assert.deepEqual(store.getCompletedLessonDays(), [4]);
  assert.equal(store.getActivity().length, 1);
  assert.equal(store.getActivity()[0].day, 4);
});

test("corrupted progress recovers to an empty state and reports the problem", () => {
  const storage = new MemoryStorage();
  const errors = [];
  storage.setItem(PROGRESS_STORAGE_KEY, "{not-json");
  const store = createProgressStore({ storage, onError:(error) => errors.push(error) });
  assert.deepEqual(store.getLessonProgress(1), { completedStepIds:[], completedAt:null });
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /could not be read/);
});

test("an unsupported progress version is not trusted", () => {
  const storage = new MemoryStorage();
  const errors = [];
  storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ version:99, lessons:{ 1:{ completedStepIds:["old"], completedAt:null } } }));
  const store = createProgressStore({ storage, onError:(error) => errors.push(error) });
  assert.deepEqual(store.getLessonProgress(1), { completedStepIds:[], completedAt:null });
  assert.match(errors[0].message, /unsupported version/);
});

test("a failed storage write is reported without corrupting in-memory progress", () => {
  const errors = [];
  const storage = {
    getItem() { return null; },
    setItem() { throw new Error("quota exceeded"); },
  };
  const store = createProgressStore({ storage, onError:(error) => errors.push(error) });
  store.saveLessonProgress(2, { completedStepIds:["first-step"], completedAt:null });
  assert.deepEqual(store.getLessonProgress(2), { completedStepIds:["first-step"], completedAt:null });
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /could not be saved/);
});
