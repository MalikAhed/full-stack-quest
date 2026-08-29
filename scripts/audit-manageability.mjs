import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const warnings = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function lineCount(source) {
  return source.split(/\r?\n/).length - (source.endsWith("\n") ? 1 : 0);
}

async function collectFiles(directory, result = []) {
  for (const entry of await readdir(directory, { withFileTypes:true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectFiles(target, result);
    else result.push(target);
  }
  return result;
}

const [indexHtml, mainSource, designLoaderSource, designViewSource, designManifest, browserSmokeSource] = await Promise.all([
  readFile(path.join(projectRoot, "index.html"), "utf8"),
  readFile(path.join(projectRoot, "src/main.js"), "utf8"),
  readFile(path.join(projectRoot, "src/ui/design-system-loader.js"), "utf8"),
  readFile(path.join(projectRoot, "src/ui/design-system-view.js"), "utf8"),
  readFile(path.join(projectRoot, "src/styles/design-system.css"), "utf8"),
  readFile(path.join(projectRoot, "scripts/browser-smoke.mjs"), "utf8"),
]);

assert(!indexHtml.includes("design-system.css"), "index.html must not preload the development-only Design System stylesheet");
assert(indexHtml.includes('data-more-tab="ui-lab"'), "More must expose the UI Lab tab");
assert(indexHtml.includes('data-more-tab="ship-ready"'), "More must expose the Ship Ready tab");
assert(indexHtml.includes('data-more-tab="design-system"'), "More must expose the Design System tab");
assert(!indexHtml.includes("prismjs"), "index.html must not preload Prism on routes without code examples");
assert(indexHtml.includes("src/styles/week-theme.css"), "index.html must load the shared week-theme token layer");
assert(mainSource.includes('from "./ui/design-system-loader.js"'), "src/main.js is missing the guarded Design System loader");
assert(designLoaderSource.includes('import("./design-system-view.js")'), "the Design System loader is missing its dynamic view import");
assert(mainSource.includes("applyWeekThemeForDay"), "lesson routes must derive their palette from the active week");
assert(mainSource.includes("DEVELOPMENT_GALLERY_ENABLED"), "the Design System gallery must remain guarded outside development");
assert(!mainSource.includes("lesson-studio"), "src/main.js still references the removed Lesson Studio");
assert(designViewSource.includes("data-markdown-feature"), "the Design System must retain its Markdown-style lesson reference");
assert(designViewSource.includes("mountShowcaseFrames"), "the Design System must retain expandable showcases");
assert((designManifest.match(/@import/g) || []).length === 12, "the Design System manifest must load its twelve owned style modules");

const sourceBudgets = [
  ["src/main.js", mainSource, 380, "extract a cohesive controller"],
  ["scripts/browser-smoke.mjs", browserSmokeSource, 520, "extract a stable browser-test helper or scenario"],
];
for (const [file, source, maximum, remedy] of sourceBudgets) {
  const lines = lineCount(source);
  assert(lines <= maximum, `${file} has ${lines} lines; ${remedy} before exceeding the ${maximum}-line growth budget`);
}

const assetFiles = await collectFiles(path.join(projectRoot, "assets"));
let assetBytes = 0;
let oversizedAssets = 0;
for (const file of assetFiles) {
  const { size } = await stat(file);
  assetBytes += size;
  if (size > 2 * 1024 * 1024) oversizedAssets += 1;
}
if (oversizedAssets) warnings.push(`${oversizedAssets} active assets exceed 2 MiB; optimize deliberately without replacing approved artwork`);

if (failures.length) {
  console.error(`Manageability audit failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`Manageability audit passed: More owns three compact tabs and the Design System remains lazy and development-only.`);
console.log(`Runtime asset inventory: ${(assetBytes / 1024 / 1024).toFixed(1)} MiB across ${assetFiles.length} files.`);
warnings.forEach((warning) => console.warn(`Manageability warning: ${warning}.`));
