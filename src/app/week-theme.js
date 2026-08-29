import { DAYS_PER_WEEK, WEEK_THEMES } from "../data/course.js";

const THEME_PROPERTIES = {
  "--quest-theme-text":"text",
  "--quest-theme-shadow-color":"shadow",
  "--quest-theme-base":"base",
  "--quest-theme-shadow":"baseShadow",
  "--quest-theme-border":"border",
  "--quest-theme-top":"top",
  "--quest-theme-main":"middle",
  "--quest-theme-bottom":"bottom",
};

export function normalizeWeekNumber(value) {
  const week = Number(value);
  return Number.isInteger(week) && week >= 1 && week <= WEEK_THEMES.length ? week : 1;
}

export function weekNumberForDay(day) {
  return normalizeWeekNumber(Math.ceil(Number(day) / DAYS_PER_WEEK));
}

export function applyWeekTheme(weekNumber, target = document.documentElement) {
  const week = normalizeWeekNumber(weekNumber);
  const theme = WEEK_THEMES[week - 1];
  Object.entries(THEME_PROPERTIES).forEach(([property, key]) => target.style.setProperty(property, theme[key]));
  target.dataset.questWeek = String(week);
  return week;
}

export function applyWeekThemeForDay(day, target) {
  return applyWeekTheme(weekNumberForDay(day), target);
}

export function applyWeekThemeFromSearch(search = window.location.search, target) {
  return applyWeekTheme(new URLSearchParams(search).get("week"), target);
}

export function resetWeekTheme(target) {
  return applyWeekTheme(1, target);
}
