import { escapeHtml } from "../lib/dom.js";
import { mountMarkdownFeatures, renderLessonInline, renderMarkdownDocument } from "../markdown/renderer.js";

function renderTable(block) {
  return `
    <div class="lesson-table-wrap" role="region" aria-label="${escapeHtml(block.caption)}" tabindex="0">
      <table>
        <caption>${escapeHtml(block.caption)}</caption>
        <thead><tr>${block.columns.map((column) => `<th scope="col">${renderLessonInline(column)}</th>`).join("")}</tr></thead>
        <tbody>${block.rows.map((row) => `<tr>${row.map((cell, index) => index === 0
    ? `<th scope="row">${renderLessonInline(cell)}</th>`
    : `<td>${renderLessonInline(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>`;
}

function renderVideo(block) {
  const descriptionId = `lesson-video-description-${escapeHtml(block.videoId)}`;
  const statusId = `lesson-video-status-${escapeHtml(block.videoId)}`;
  return `
    <section class="lesson-video" data-lesson-video="${escapeHtml(block.videoId)}" aria-labelledby="lesson-video-title-${escapeHtml(block.videoId)}">
      <header class="lesson-video-head">
        <div><p class="lesson-content-label">CURATED VIDEO · OPTIONAL REINFORCEMENT</p><h3 id="lesson-video-title-${escapeHtml(block.videoId)}">${escapeHtml(block.title)}</h3></div>
        <span>${escapeHtml(block.duration)}</span>
      </header>
      <p>${renderLessonInline(block.purpose)}</p>
      <p class="lesson-video-cue"><strong>Watch for:</strong> ${renderLessonInline(block.watchFor)}</p>
      <div class="lesson-video-player" data-video-player>
        <button type="button" data-load-video aria-describedby="${descriptionId} ${statusId}">
          <span class="lesson-video-play" aria-hidden="true">PLAY</span>
          <span><strong>Load the YouTube video</strong><small>${escapeHtml(block.creator)} · captions available</small></span>
        </button>
      </div>
      <div class="lesson-video-meta" id="${descriptionId}">
        <p>YouTube loads only after you choose Play. Captions start on. The written lesson remains complete without the player.</p>
        <a href="${escapeHtml(block.watchUrl)}" target="_blank" rel="noopener noreferrer">Open on YouTube <span class="visually-hidden">in a new tab</span></a>
      </div>
      <p class="lesson-video-caveat"><strong>Scope note:</strong> ${renderLessonInline(block.caveat)}</p>
      <p class="lesson-video-prompt"><strong>After watching:</strong> ${renderLessonInline(block.prompt)}</p>
      <p class="visually-hidden" id="${statusId}" role="status" aria-live="polite" data-video-status></p>
    </section>`;
}

function renderResources(block) {
  return `<ul class="lesson-resource-list">${block.items.map((item) => `
    <li>
      <a href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)} <span class="visually-hidden">opens in a new tab</span></a>
      <p>${renderLessonInline(item.description)}</p>
    </li>`).join("")}</ul>`;
}

function renderBlock(block) {
  if (block.type === "paragraph") return `<p>${renderLessonInline(block.text)}</p>`;
  if (block.type === "subheading") return `<h3>${renderLessonInline(block.text)}</h3>`;
  if (block.type === "list") {
    const tag = block.ordered ? "ol" : "ul";
    return `<${tag}>${block.items.map((item) => `<li>${renderLessonInline(item)}</li>`).join("")}</${tag}>`;
  }
  if (block.type === "note") {
    return `<aside class="lesson-note"><strong>${escapeHtml(block.label)}</strong><p>${renderLessonInline(block.text)}</p></aside>`;
  }
  if (block.type === "quote") {
    return `<blockquote><strong>${escapeHtml(block.label)}</strong><p>${renderLessonInline(block.text)}</p></blockquote>`;
  }
  if (block.type === "definitions") {
    return `<dl class="lesson-definitions">${block.items.map((item) => `<dt>${renderLessonInline(item.term)}</dt><dd>${renderLessonInline(item.definition)}</dd>`).join("")}</dl>`;
  }
  if (block.type === "table") return renderTable(block);
  if (block.type === "resources") return renderResources(block);
  if (block.type === "video") return renderVideo(block);
  if (block.type === "markdown") return `<div class="markdown-rendered lesson-markdown">${renderMarkdownDocument(block.source)}</div>`;
  return "";
}

export function renderLessonContent(step) {
  const body = step.body ? `<p>${renderLessonInline(step.body)}</p>` : "";
  return `<div class="lesson-section-content">${body}${step.blocks.map(renderBlock).join("")}</div>`;
}

export function mountLessonVideos(container, signal) {
  container.querySelectorAll("[data-lesson-video]").forEach((video) => {
    const videoId = video.dataset.lessonVideo;
    const player = video.querySelector("[data-video-player]");
    const loadButton = video.querySelector("[data-load-video]");
    const status = video.querySelector("[data-video-status]");

    loadButton.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.className = "lesson-video-iframe";
      iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&cc_load_policy=1&cc_lang_pref=en`;
      iframe.title = `${video.querySelector("h3").textContent} by ${video.querySelector("small").textContent.split(" · ")[0]}`;
      iframe.width = "800";
      iframe.height = "450";
      iframe.loading = "lazy";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allow = "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      iframe.addEventListener("load", () => {
        status.textContent = "YouTube video player loaded.";
      }, { signal, once:true });
      iframe.addEventListener("error", () => {
        status.textContent = "The YouTube player could not load. Use the direct link or continue with the written lesson.";
      }, { signal, once:true });
      player.replaceChildren(iframe);
      status.textContent = "Loading the YouTube video player.";
      iframe.focus();
    }, { signal, once:true });
  });
}

export function mountLessonMarkdown(container, signal) {
  mountMarkdownFeatures(container, { signal });
}
