import { access, open, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COURSE_WEEKS, DAYS_PER_WEEK, TOTAL_DAYS, WEEK_THEMES } from "../src/data/course.js";
import { createLessonLoader } from "../src/data/lessons/load-lessons.js";
import { lessonRegistry } from "../src/data/lessons/lesson-registry.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

async function assertFile(relativePath, context) {
  try {
    await access(path.join(projectRoot, relativePath));
  } catch {
    failures.push(`${context}: missing ${relativePath}`);
  }
}

async function readImageSize(relativePath) {
  const file = await open(path.join(projectRoot, relativePath), "r");
  try {
    const header = Buffer.alloc(30);
    await file.read(header, 0, header.length, 0);
    if (header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      return { width:header.readUInt32BE(16), height:header.readUInt32BE(20) };
    }
    if (header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WEBP") {
      const format = header.toString("ascii", 12, 16);
      if (format === "VP8 ") {
        return { width:header.readUInt16LE(26) & 0x3fff, height:header.readUInt16LE(28) & 0x3fff };
      }
      if (format === "VP8L") {
        return {
          width:1 + header[21] + ((header[22] & 0x3f) << 8),
          height:1 + (header[22] >> 6) + (header[23] << 2) + ((header[24] & 0x0f) << 10),
        };
      }
      if (format === "VP8X") {
        return {
          width:1 + header.readUIntLE(24, 3),
          height:1 + header.readUIntLE(27, 3),
        };
      }
    }
    throw new Error(`Unsupported image format: ${relativePath}`);
  } finally {
    await file.close();
  }
}

async function collectJavaScript(directory, result = []) {
  const entries = await readdir(directory, { withFileTypes:true });
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectJavaScript(target, result);
    else if (entry.name.endsWith(".js")) result.push(target);
  }
  return result;
}

assert(COURSE_WEEKS.length === 16, `expected 16 course weeks, found ${COURSE_WEEKS.length}`);
assert(WEEK_THEMES.length === COURSE_WEEKS.length, "every course week must have one theme");
assert(TOTAL_DAYS === COURSE_WEEKS.length * DAYS_PER_WEEK, "TOTAL_DAYS must be derived from weeks and days per week");

for (const [index, week] of COURSE_WEEKS.entries()) {
  const weekNumber = index + 1;
  assert(week.positions.length === DAYS_PER_WEEK, `week ${weekNumber} must define ${DAYS_PER_WEEK} level positions`);
  assert(week.positions.every(([left, top]) => Number.isFinite(left) && Number.isFinite(top)), `week ${weekNumber} has an invalid level position`);
  await assertFile(week.cardImage, `week ${weekNumber}`);
  const cardSize = await readImageSize(week.cardImage);
  assert(cardSize.width === (week.cardWidth || 1979) && cardSize.height === (week.cardHeight || 794), `week ${weekNumber} card dimensions do not match its HTML metadata`);
  const biomePath = `assets/biomes/${weekNumber}.webp`;
  await assertFile(biomePath, `week ${weekNumber}`);
  const biomeSize = await readImageSize(biomePath);
  assert(biomeSize.width === 941 && biomeSize.height === (week.biomeHeight || 1672), `week ${weekNumber} biome dimensions do not match its HTML metadata`);
}

const indexHtml = await readFile(path.join(projectRoot, "index.html"), "utf8");
for (const match of indexHtml.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  const reference = match[1];
  if (/^(?:https?:|data:)/.test(reference)) continue;
  await assertFile(reference, "index.html");
}

for (const file of await collectJavaScript(path.join(projectRoot, "src"))) {
  const source = (await readFile(file, "utf8"))
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const match of source.matchAll(/(?:from\s+|import\()(["'])(\.\.?\/[^"']+)\1/g)) {
    const target = path.resolve(path.dirname(file), match[2]);
    try {
      await access(target);
    } catch {
      failures.push(`${path.relative(projectRoot, file)} imports missing ${path.relative(projectRoot, target)}`);
    }
  }
}

const loadLesson = createLessonLoader();
let candidateLessons = 0;
let publishedLessons = 0;
for (const day of lessonRegistry.keys()) {
  assert(Number.isInteger(day) && day >= 1 && day <= TOTAL_DAYS, `lesson registry contains invalid day ${day}`);
  const lesson = await loadLesson(day);
  if (lesson?.status === "candidate") candidateLessons += 1;
  if (lesson?.status === "published") publishedLessons += 1;
}

if (failures.length) {
  console.error(`Static application validation failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`Static application validation passed: ${COURSE_WEEKS.length} weeks, ${TOTAL_DAYS} days, ${candidateLessons} candidate lessons, ${publishedLessons} published lessons.`);
