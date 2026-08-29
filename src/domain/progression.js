import { TOTAL_DAYS } from "../data/course.js";

export const XP_PER_LESSON = 100;
export const TOTAL_COURSE_XP = TOTAL_DAYS * XP_PER_LESSON;

const RANK_NAMES = [
  "Bronze", "Copper", "Iron", "Silver", "Gold", "Platinum", "Emerald", "Sapphire",
  "Ruby", "Amethyst", "Obsidian", "Mythril", "Diamond", "Master", "Grandmaster", "Full-Stack Legend",
];

export const RANKS = Object.freeze(RANK_NAMES.map((name, index) => Object.freeze({
  number:index + 1,
  name,
  minimumXp:index === 0 ? 0 : Math.ceil((TOTAL_DAYS * index) / (RANK_NAMES.length - 1)) * XP_PER_LESSON,
})));

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function dayNumber(dateKey) {
  if (typeof dateKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return Math.floor(timestamp / 86_400_000);
}

export function getRankProgress(totalXp) {
  const earnedXp = clamp(Number.isFinite(totalXp) ? Math.floor(totalXp) : 0, 0, TOTAL_COURSE_XP);
  let rankIndex = RANKS.findLastIndex((rank) => earnedXp >= rank.minimumXp);
  if (rankIndex < 0) rankIndex = 0;
  const rank = RANKS[rankIndex];
  const nextRank = RANKS[rankIndex + 1] || null;
  const rankXp = nextRank ? earnedXp - rank.minimumXp : TOTAL_COURSE_XP;
  const rankXpTarget = nextRank ? nextRank.minimumXp - rank.minimumXp : TOTAL_COURSE_XP;
  return Object.freeze({
    earnedXp,
    rank,
    nextRank,
    rankXp,
    rankXpTarget,
    progressPercent:nextRank ? (rankXp / rankXpTarget) * 100 : 100,
  });
}

export function calculateStreak(activityDates, today) {
  const todayNumber = dayNumber(today);
  if (todayNumber === null) throw new TypeError("today must be a valid YYYY-MM-DD date");
  const days = [...new Set(activityDates.map(dayNumber).filter((day) => day !== null && day <= todayNumber))].sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let previous = null;
  for (const day of days) {
    run = previous !== null && day === previous + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }
  const latest = days.at(-1);
  if (latest === undefined || todayNumber - latest > 1) return Object.freeze({ current:0, longest, activeToday:false });
  let current = 1;
  for (let index = days.length - 2; index >= 0 && days[index] === days[index + 1] - 1; index -= 1) current += 1;
  return Object.freeze({ current, longest, activeToday:latest === todayNumber });
}

export function getProgressionSummary({ completedLessonDays, activityDates, today }) {
  const completedDays = [...new Set(completedLessonDays)].filter((day) => Number.isInteger(day) && day >= 1 && day <= TOTAL_DAYS);
  const totalXp = completedDays.length * XP_PER_LESSON;
  const todayLessonCount = completedDays.filter((day) => activityDates.some((activity) => activity.day === day && activity.date === today)).length;
  return Object.freeze({
    completedLessonCount:completedDays.length,
    totalXp,
    todayXp:todayLessonCount * XP_PER_LESSON,
    ...getRankProgress(totalXp),
    streak:calculateStreak(activityDates.map(({ date }) => date), today),
  });
}
