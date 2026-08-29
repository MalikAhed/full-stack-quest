import assert from "node:assert/strict";
import test from "node:test";
import { applyWeekTheme, normalizeWeekNumber, weekNumberForDay } from "../src/app/week-theme.js";

function createThemeTarget() {
  const properties = new Map();
  return { dataset:{}, properties, style:{ setProperty(name, value) { properties.set(name, value); } } };
}

test("week themes normalize invalid input and map every seven lesson days", () => {
  assert.equal(normalizeWeekNumber(11), 11);
  assert.equal(normalizeWeekNumber(17), 1);
  assert.equal(weekNumberForDay(1), 1);
  assert.equal(weekNumberForDay(7), 1);
  assert.equal(weekNumberForDay(8), 2);
  assert.equal(weekNumberForDay(112), 16);
});

test("applying a week theme writes the complete semantic palette", () => {
  const target = createThemeTarget();
  assert.equal(applyWeekTheme(11, target), 11);
  assert.equal(target.dataset.questWeek, "11");
  assert.equal(target.properties.get("--quest-theme-main"), "#36aaf5");
  assert.equal(target.properties.get("--quest-theme-text"), "#073b71");
  assert.equal(target.properties.size, 8);
});
