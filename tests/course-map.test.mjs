import assert from "node:assert/strict";
import test from "node:test";
import { renderCourseMapMarkup } from "../src/ui/course-map.js";

test("the learning map contains no development reference nodes", () => {
  assert.doesNotMatch(renderCourseMapMarkup(), /data-lesson-studio/);
  assert.doesNotMatch(renderCourseMapMarkup(), /data-design-system/);
});
