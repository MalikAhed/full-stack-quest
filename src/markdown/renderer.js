import DOMPurify from "../../node_modules/dompurify/dist/purify.es.mjs";
import hljs from "../../node_modules/@highlightjs/cdn-assets/es/highlight.min.js";
import { Marked } from "../../node_modules/marked/lib/marked.esm.js";
import { escapeHtml } from "../lib/dom.js";
import { LESSON_CONTENT_DIRECTIVES } from "./lesson-authoring.js";

const GLOSSARY = new Map([
  ["api", "A defined way for software systems to request data or actions from each other."],
  ["http", "The protocol browsers and servers use to exchange requests and responses on the web."],
  ["origin", "The combination of a URL’s scheme, host, and port."],
  ["runtime", "The environment that executes a program while it is running."],
]);
const CONTENT_DIRECTIVE_TYPES = new Set(LESSON_CONTENT_DIRECTIVES);
const CALLOUT_KINDS = new Set(LESSON_CONTENT_DIRECTIVES.filter((kind) => kind !== "reveal"));
const mountedContainers = new WeakMap();
let technicalTermId = 0;

function parseYouTubeUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
  let videoId = "";
  if (host === "youtu.be") videoId = url.pathname.split("/").filter(Boolean)[0] || "";
  if (host === "youtube.com") {
    const path = url.pathname.split("/").filter(Boolean);
    if (url.pathname === "/watch") videoId = url.searchParams.get("v") || "";
    else if (["embed", "shorts", "live"].includes(path[0])) videoId = path[1] || "";
  }
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;

  const timeValue = url.searchParams.get("t") || url.searchParams.get("start") || new URLSearchParams(url.hash.slice(1)).get("t") || "";
  const timeParts = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(timeValue);
  const start = /^\d+$/.test(timeValue)
    ? Number(timeValue)
    : timeParts ? (Number(timeParts[1] || 0) * 3600) + (Number(timeParts[2] || 0) * 60) + Number(timeParts[3] || 0) : 0;
  const safeStart = Number.isSafeInteger(start) && start > 0 ? start : 0;
  const sourceUrl = new URL(`https://www.youtube.com/watch?v=${videoId}`);
  if (safeStart) sourceUrl.searchParams.set("t", `${safeStart}s`);
  return { videoId, start:safeStart, sourceUrl:sourceUrl.href };
}

function parseCodeMeta(info = "") {
  const language = info.trim().split(/\s+/)[0]?.toLowerCase() || "";
  const title = /(?:^|\s)title=(?:"([^"]*)"|'([^']*)'|([^\s]+))/.exec(info);
  const highlights = /(?:^|\s)highlight=(?:"([^"]*)"|'([^']*)'|([^\s]+))/.exec(info);
  const highlightedLines = new Set();
  (highlights?.[1] || highlights?.[2] || highlights?.[3] || "").split(",").forEach((part) => {
    const [start, end = start] = part.trim().split("-").map(Number);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end - start > 200) return;
    for (let line = start; line <= end; line += 1) highlightedLines.add(line);
  });
  return { language, title:title?.[1] || title?.[2] || title?.[3] || "", highlightedLines };
}

const technicalTermExtension = {
  name:"technicalTerm",
  level:"inline",
  start(source) {
    const explicitIndex = source.toLowerCase().indexOf("[[term:");
    const shortIndex = source.indexOf("[[");
    if (explicitIndex < 0) return shortIndex >= 0 ? shortIndex : undefined;
    return shortIndex < 0 ? explicitIndex : Math.min(explicitIndex, shortIndex);
  },
  tokenizer(source) {
    const explicit = /^\[\[term:\s*([^|\]\n]{1,80}?)(?:\s*\|\s*([^\]\n]{1,420}?))?\s*\]\]/i.exec(source);
    const shorthand = /^\[\[([A-Za-z][A-Za-z0-9 .+#/-]{0,79})\]\]/.exec(source);
    const match = explicit || shorthand;
    if (!match) return undefined;
    const term = match[1].trim();
    const definition = explicit?.[2]?.trim() || GLOSSARY.get(term.toLowerCase());
    if (!definition) return undefined;
    return { type:"technicalTerm", raw:match[0], term, definition };
  },
  renderer(token) {
    technicalTermId += 1;
    const term = escapeHtml(token.term);
    const definitionId = `markdown-term-${technicalTermId}`;
    return `<dfn class="markdown-tech-term" tabindex="0" aria-describedby="${definitionId}"><span class="markdown-tech-label">${term}</span><span class="markdown-tech-card" id="${definitionId}" role="tooltip"><small>TECH TERM</small><strong>${term}</strong><span>${escapeHtml(token.definition)}</span></span></dfn>`;
  },
};

const lessonDirectiveExtension = {
  name:"lessonDirective",
  level:"block",
  start(source) {
    const index = source.indexOf(":::");
    return index >= 0 ? index : undefined;
  },
  tokenizer(source) {
    const match = /^:::([a-z][a-z0-9-]*)(?:[ \t]+([^\n]+))?\n([\s\S]*?)\n:::(?:\n|$)/i.exec(source);
    const kind = match?.[1]?.toLowerCase();
    if (!match || !CONTENT_DIRECTIVE_TYPES.has(kind)) return undefined;
    const title = match[2]?.trim() || (kind === "reveal" ? "Show explanation" : kind);
    const tokens = this.lexer.blockTokens(match[3].trim());
    return { type:"lessonDirective", raw:match[0], kind, title, tokens };
  },
  renderer(token) {
    const content = this.parser.parse(token.tokens);
    const title = escapeHtml(token.title);
    if (token.kind === "reveal") {
      return `<details class="markdown-reveal"><summary>${title}</summary><div>${content}</div></details>`;
    }
    const kind = CALLOUT_KINDS.has(token.kind) ? token.kind : "note";
    return `<aside class="markdown-callout markdown-callout--${kind}"><strong>${title}</strong><div>${content}</div></aside>`;
  },
  childTokens:["tokens"],
};

const youtubeVideoExtension = {
  name:"youtubeVideo",
  level:"block",
  start(source) {
    const match = /(?:^|\n)[ \t]{0,3}https?:\/\/(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\//i.exec(source);
    if (!match) return undefined;
    return match.index + (match[0].startsWith("\n") ? 1 : 0);
  },
  tokenizer(source) {
    const match = /^[ \t]{0,3}(https?:\/\/[^\s<>]+)[ \t]*(?:\n|$)/i.exec(source);
    if (!match) return undefined;
    const video = parseYouTubeUrl(match[1]);
    if (!video) return undefined;
    return { type:"youtubeVideo", raw:match[0], sourceUrl:video.sourceUrl };
  },
  renderer(token) {
    return `<div class="markdown-youtube"><a class="markdown-youtube-source" href="${escapeHtml(token.sourceUrl)}">Watch this video on YouTube</a></div>`;
  },
};

const codeRenderer = {
  code({ text, lang }) {
    const { language, title, highlightedLines } = parseCodeMeta(lang);
    const hasLanguage = Boolean(language && hljs.getLanguage(language));
    const highlighted = hasLanguage
      ? hljs.highlight(text, { language, ignoreIllegals:true })
      : hljs.highlightAuto(text);
    const detectedLanguage = hasLanguage ? language : highlighted.language;
    const languageClass = detectedLanguage ? ` language-${escapeHtml(detectedLanguage)}` : "";
    const languageLabel = detectedLanguage ? escapeHtml(detectedLanguage.toUpperCase()) : "AUTO-DETECTED";
    const code = highlighted.value.split("\n").map((line, index) => {
      const highlightedClass = highlightedLines.has(index + 1) ? " is-highlighted" : "";
      return `<span class="markdown-code-line${highlightedClass}">${line || " "}</span>`;
    }).join("\n");
    const heading = title ? `<span>${escapeHtml(title)}</span>` : "<span>CODE</span>";
    return `<div class="markdown-code-block"><div class="markdown-code-head">${heading}<b>${languageLabel}</b></div><pre><code class="hljs${languageClass}">${code}</code></pre></div>`;
  },
};

const markdown = new Marked({
  async:false,
  breaks:false,
  extensions:[technicalTermExtension, lessonDirectiveExtension, youtubeVideoExtension],
  gfm:true,
  pedantic:false,
  renderer:codeRenderer,
});

function sanitize(html) {
  return DOMPurify.sanitize(html, {
    USE_PROFILES:{ html:true },
    ALLOW_DATA_ATTR:false,
    FORBID_ATTR:["style"],
    FORBID_TAGS:["button", "embed", "form", "iframe", "object", "option", "script", "select", "style", "textarea"],
  });
}

export function renderMarkdownDocument(source) {
  return sanitize(markdown.parse(String(source)));
}

export function renderMarkdownInline(source) {
  return sanitize(markdown.parseInline(String(source)));
}

export function renderLessonInline(source) {
  return renderMarkdownInline(source).replaceAll("<code>", '<code class="lesson-inline-code">');
}

function wrapTables(container) {
  container.querySelectorAll(".markdown-rendered table").forEach((table) => {
    if (table.parentElement?.classList.contains("markdown-table-scroll")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "markdown-table-scroll";
    wrapper.tabIndex = 0;
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", "Scrollable table");
    table.before(wrapper);
    wrapper.append(table);
  });
}

function mountYouTubeVideos(container) {
  container.querySelectorAll(".markdown-youtube-source").forEach((link) => {
    const video = parseYouTubeUrl(link.href);
    if (!video) return;
    const source = new URL(`https://www.youtube-nocookie.com/embed/${video.videoId}`);
    source.searchParams.set("rel", "0");
    if (video.start) source.searchParams.set("start", String(video.start));
    const player = document.createElement("iframe");
    player.className = "markdown-youtube-player";
    player.src = source.href;
    player.title = "YouTube video player";
    player.loading = "lazy";
    player.referrerPolicy = "strict-origin-when-cross-origin";
    player.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    player.allowFullscreen = true;
    link.replaceWith(player);
  });
}

export function mountMarkdownFeatures(container, { signal, scrollSurface } = {}) {
  wrapTables(container);
  mountYouTubeVideos(container);
  if (mountedContainers.has(container) && mountedContainers.get(container) === signal) return;
  mountedContainers.set(container, signal);
  const contentScrollButton = container.querySelector("[data-content-scroll]");
  if (contentScrollButton && scrollSurface) {
    const updateContentOverflow = () => {
      const hasOverflow = scrollSurface.scrollHeight > scrollSurface.clientHeight + 2;
      const hasMore = hasOverflow && scrollSurface.scrollTop + scrollSurface.clientHeight < scrollSurface.scrollHeight - 2;
      scrollSurface.classList.toggle("has-more-content", hasMore);
    };
    const overflowObserver = new ResizeObserver(updateContentOverflow);
    contentScrollButton.addEventListener("click", () => {
      scrollSurface.scrollBy({ top:Math.max(140, scrollSurface.clientHeight * .58), behavior:"smooth" });
    }, { signal });
    scrollSurface.addEventListener("scroll", updateContentOverflow, { signal, passive:true });
    overflowObserver.observe(scrollSurface);
    [...scrollSurface.children].forEach((child) => overflowObserver.observe(child));
    signal?.addEventListener("abort", () => overflowObserver.disconnect(), { once:true });
    window.requestAnimationFrame(updateContentOverflow);
  }
  const positionTermCard = (term) => {
    const card = term.querySelector(".markdown-tech-card");
    const surface = scrollSurface || term.closest(".markdown-preview-scroll,.lesson-stage") || container;
    if (!card || !surface) return;
    card.classList.remove("is-above");
    card.style.setProperty("--term-shift-x", "0px");
    window.requestAnimationFrame(() => {
      if (!term.isConnected) return;
      const bounds = surface.getBoundingClientRect();
      const termRect = term.getBoundingClientRect();
      if (termRect.bottom + card.offsetHeight + 24 > bounds.bottom && termRect.top - bounds.top > card.offsetHeight + 22) {
        card.classList.add("is-above");
      }
      const naturalLeft = termRect.left + (termRect.width - card.offsetWidth) / 2;
      const shift = naturalLeft < bounds.left + 12 ? bounds.left + 12 - naturalLeft
        : naturalLeft + card.offsetWidth > bounds.right - 12 ? bounds.right - 12 - naturalLeft - card.offsetWidth : 0;
      card.style.setProperty("--term-shift-x", `${shift}px`);
    });
  };
  ["pointerover", "focusin"].forEach((eventName) => container.addEventListener(eventName, (event) => {
    const term = event.target.closest?.(".markdown-tech-term");
    if (term) positionTermCard(term);
  }, { signal }));
}
