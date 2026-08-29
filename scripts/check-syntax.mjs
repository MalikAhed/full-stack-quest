import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoots = ["src", "scripts", "tests", "assets/vendor"];
const files = [path.join(projectRoot, "dev-server.mjs")];

async function collectJavaScript(directory) {
  const entries = await readdir(directory, { withFileTypes:true });
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectJavaScript(target);
    else if (/\.(?:js|mjs)$/.test(entry.name)) files.push(target);
  }
}

for (const sourceRoot of sourceRoots) {
  await collectJavaScript(path.join(projectRoot, sourceRoot));
}

for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding:"utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

console.log(`Syntax validation passed for ${files.length} JavaScript files.`);
