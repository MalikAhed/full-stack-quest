import { createReadStream, promises as fs } from "node:fs";
import { watch } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getShipReadyTemplate } from "./src/data/ship-ready.js";
import { createExplanationReviewService } from "./src/server/explanation-review.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const realRoot = await fs.realpath(root);
const port = Number(process.env.PORT ?? 4173);
if (!Number.isInteger(port) || port < 0 || port > 65_535) {
  throw new TypeError("PORT must be an integer between 0 and 65535.");
}
const clients = new Set();
const reviewExplanation = createExplanationReviewService({ projectRoot:root });
const mimeTypes = {
  ".css":"text/css; charset=utf-8", ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8", ".mjs":"text/javascript; charset=utf-8",
  ".json":"application/json; charset=utf-8", ".png":"image/png", ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg", ".svg":"image/svg+xml", ".webp":"image/webp", ".zip":"application/zip",
  ".ttf":"font/ttf", ".woff":"font/woff", ".woff2":"font/woff2",
};

const liveReloadClient = `
<script>window.__FULL_STACK_QUEST_DEV__=true;</script>
<script data-codex-live-reload>
(() => {
  const key = "codex-preview-scroll:" + location.pathname + location.search;
  history.scrollRestoration = "manual";
  const saveScroll = () => sessionStorage.setItem(key, String(window.scrollY));
  const restoreScroll = () => {
    const saved = Number(sessionStorage.getItem(key));
    if (Number.isFinite(saved) && saved > 0) window.scrollTo(0, saved);
  };
  addEventListener("scroll", saveScroll, { passive:true });
  addEventListener("load", () => {
    requestAnimationFrame(() => requestAnimationFrame(restoreScroll));
    setTimeout(restoreScroll, 180);
    setTimeout(restoreScroll, 500);
  }, { once:true });
  const updates = new EventSource("/__codex_reload");
  updates.addEventListener("reload", () => {
    saveScroll();
    location.reload();
  });
})();
</script>`;

function safeFilePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  if (decoded.includes("\0")) throw new URIError("URL paths cannot contain null bytes");
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const resolved = path.resolve(root, relative);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store",
  }).end(JSON.stringify(value));
}

async function readJsonBody(request, maximumBytes = 8_192) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > maximumBytes) {
      const error = new Error("Request body is too large.");
      error.code = "ETOOBIG";
      throw error;
    }
  }
  return JSON.parse(body || "{}");
}

function readAuthoredReview(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const prompt = typeof value.prompt === "string" ? value.prompt.trim() : "";
  const rubric = Array.isArray(value.rubric) ? value.rubric.map((item) => typeof item === "string" ? item.trim() : "") : [];
  const maxLength = Number(value.maxLength);
  const passScore = Number(value.passScore);
  if (!title || title.length > 160 || !prompt || prompt.length > 800 || rubric.length < 1 || rubric.length > 8
    || rubric.some((item) => !item || item.length > 240) || !Number.isInteger(maxLength) || maxLength < 80 || maxLength > 2_000
    || !Number.isInteger(passScore) || passScore < 1 || passScore > 10) return null;
  return { title, prompt, rubric, maxLength, review:{ passScore } };
}

async function handleExplanationReview(request, response) {
  if (request.method !== "POST") {
    response.writeHead(405, { Allow:"POST" }).end("Method not allowed");
    return;
  }
  if (!request.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
    sendJson(response, 415, { error:"Content-Type must be application/json." });
    return;
  }
  try {
    const body = await readJsonBody(request);
    const route = typeof body.route === "string" ? body.route : "";
    const answer = typeof body.answer === "string" ? body.answer.trim() : "";
    const definition = getShipReadyTemplate(route);
    const content = definition?.type === "response" ? definition.content
      : route === "lesson-authoring-preview" ? readAuthoredReview(body.authoredReview) : null;
    if (!content) {
      sendJson(response, 400, { error:"Unknown explanation template." });
      return;
    }
    if (!answer || answer.length > content.maxLength) {
      sendJson(response, 400, { error:`Answer must contain 1-${content.maxLength} characters.` });
      return;
    }
    const result = await reviewExplanation({ answer, content, route });
    sendJson(response, result.source === "codex" ? 200 : 503, result);
  } catch (error) {
    if (error?.code === "ETOOBIG") sendJson(response, 413, { error:"Request body is too large." });
    else if (error instanceof SyntaxError) sendJson(response, 400, { error:"Request body must be valid JSON." });
    else {
      console.error("Could not review the explanation.", error);
      sendJson(response, 500, { error:"The explanation could not be reviewed." });
    }
  }
}

const server = createServer(async (request, response) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");

  if (request.url?.split("?")[0] === "/api/explain-review") {
    await handleExplanationReview(request, response);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow:"GET, HEAD" }).end("Method not allowed");
    return;
  }

  if (request.url?.startsWith("/__codex_reload")) {
    if (request.method === "HEAD") {
      response.writeHead(200, { "Content-Type":"text/event-stream", "Cache-Control":"no-cache" }).end();
      return;
    }
    response.writeHead(200, {
      "Content-Type":"text/event-stream", "Cache-Control":"no-cache",
      "Connection":"keep-alive", "Access-Control-Allow-Origin":"*",
    });
    response.write("retry: 500\n\n");
    clients.add(response);
    request.on("close", () => clients.delete(response));
    return;
  }

  let filePath;
  try {
    filePath = safeFilePath(request.url || "/");
  } catch (error) {
    if (error instanceof URIError) {
      response.writeHead(400).end("Bad request");
      return;
    }
    console.error("Could not parse the requested URL.", error);
    response.writeHead(500).end("Internal server error");
    return;
  }
  if (!filePath) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    const target = stat.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const realTarget = await fs.realpath(target);
    if (realTarget !== realRoot && !realTarget.startsWith(`${realRoot}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const extension = path.extname(realTarget).toLowerCase();
    response.setHeader("Content-Type", mimeTypes[extension] || "application/octet-stream");
    response.setHeader("Cache-Control", "no-store");
    if (extension === ".html") {
      const html = await fs.readFile(realTarget, "utf8");
      if (request.method === "HEAD") response.end();
      else response.end(html.replace("</body>", `${liveReloadClient}</body>`));
    } else {
      if (request.method === "HEAD") response.end();
      else {
        const stream = createReadStream(realTarget);
        stream.on("error", (streamError) => {
          console.error("Could not stream the requested file.", streamError);
          if (!response.headersSent) response.writeHead(500).end("Internal server error");
          else response.destroy(streamError);
        });
        stream.pipe(response);
      }
    }
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
      response.writeHead(404).end("Not found");
      return;
    }
    console.error("Could not serve the requested file.", error);
    response.writeHead(500).end("Internal server error");
  }
});

let reloadTimer;
const watcher = watch(root, { recursive:true }, (_event, filename = "") => {
  const normalized = String(filename).replaceAll("\\", "/");
  if (!normalized || ["artifacts/", "codex screen shots/", "tmp/"].some((directory) => normalized.startsWith(directory)) || normalized.startsWith(".git/") || normalized.includes("/.git/")) return;
  if (!/\.(?:css|html|js|json|mjs|png|jpe?g|svg|webp)$/i.test(normalized)) return;
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    for (const client of clients) client.write("event: reload\ndata: changed\n\n");
  }, 120);
});

server.listen(port, "0.0.0.0", () => {
  const address = server.address();
  const activePort = typeof address === "object" && address ? address.port : port;
  console.log(`Live preview: http://localhost:${activePort}/`);
  console.log("Watching source files and preserving scroll position on reload.");
});

let isShuttingDown = false;
function shutDown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  clearTimeout(reloadTimer);
  watcher.close();
  clients.forEach((client) => client.end());
  clients.clear();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
