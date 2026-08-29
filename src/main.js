import { createRouteUrl, readRoute } from "./app/route.js";
import { applyWeekThemeForDay, applyWeekThemeFromSearch, resetWeekTheme } from "./app/week-theme.js";
import { TOTAL_DAYS } from "./data/course.js";
import { loadLesson } from "./data/lessons/load-lessons.js";
import { createProgressStore, getBrowserStorage } from "./data/progress-store.js";
import { getShipReadyTemplate, isShipReadyRoute } from "./data/ship-ready.js";
import { getRequiredElement, prefersReducedMotion } from "./lib/dom.js";
import { renderCourseMap } from "./ui/course-map.js";
import { loadDesignSystem } from "./ui/design-system-loader.js";
import { createDialogController } from "./ui/dialog.js";
import { createProgressController } from "./ui/game-progress.js";
import { renderLesson, renderLessonError, renderLessonLoading } from "./ui/lesson-view.js";
import { renderMarkdownLab } from "./ui/markdown-lab.js";
import { createMoreTabs } from "./ui/more-tabs.js";
import { renderShipReadyLibrary } from "./ui/ship-ready.js";
import { renderUiLab } from "./ui/ui-lab/index.js";
import { renderUiLabLibrary } from "./ui/ui-lab-library.js";

const APP_TITLE = "Full-Stack Quest";
const DEVELOPMENT_GALLERY_ENABLED = window.__FULL_STACK_QUEST_DEV__ === true;
let activeLessonDay = null, lessonOpener = null;
const elements = {
  backdrop:getRequiredElement(".overview-backdrop"), closeOverviewButton:getRequiredElement(".modal-close"),
  column:getRequiredElement(".column"), comingSoon:getRequiredElement(".coming-soon"),
  courseUnits:getRequiredElement(".course-units"), lessonBackButton:getRequiredElement(".lesson-back"),
  lessonCard:getRequiredElement(".lesson-card"), lessonContent:getRequiredElement("#lesson-content"),
  lessonShell:getRequiredElement(".lesson-shell"), lessonStatus:getRequiredElement(".lesson-status"),
  lessonTitle:getRequiredElement(".current-view-title"), lessonView:getRequiredElement(".lesson-view"),
  main:getRequiredElement("main"), moreTabs:getRequiredElement(".more-tabs"),
  navigationItems:[...document.querySelectorAll(".nav-item")], overview:getRequiredElement(".sidebar"),
  overviewButton:getRequiredElement(".overview-trigger"), topbarWrap:getRequiredElement(".topbar-wrap"),
};

const progressStore = createProgressStore({ storage:getBrowserStorage() });
let activeContentCleanup = () => {};
let lessonRequest = 0;
let pathScrollPosition = 0;

renderCourseMap(elements.courseUnits);
const progressController = createProgressController({ root:document, courseContainer:elements.courseUnits, progressStore });

const overviewDialog = createDialogController({
  root:elements.overview,
  trigger:elements.overviewButton,
  backdrop:elements.backdrop,
  closeButton:elements.closeOverviewButton,
  inactiveElements:[elements.topbarWrap, elements.column, elements.comingSoon, elements.lessonView],
  bodyClass:"overview-open",
});

function disposeActiveContent() {
  activeContentCleanup();
  activeContentCleanup = () => {};
}

function useContentLifecycle(result) {
  disposeActiveContent();
  activeContentCleanup = typeof result?.destroy === "function" ? result.destroy : () => {};
}

function writeRoute(route, historyMode) {
  if (historyMode === "none") return false;
  const nextUrl = createRouteUrl(window.location.href, route);
  if (nextUrl.href === window.location.href) return false;
  const state = { ...(window.history.state || {}), fullStackQuest:true };
  window.history[historyMode === "replace" ? "replaceState" : "pushState"](state, "", nextUrl);
  return true;
}

function showContentView() {
  elements.main.classList.remove("coming-mode");
  elements.main.classList.add("lesson-mode");
  elements.comingSoon.classList.remove("is-visible");
  elements.lessonView.classList.add("is-visible");
}

function setDevelopmentViewMode(view = null) {
  const isDesignSystem = view === "design-system" || view === "practice-lab";
  const isUiLab = view === "ui-lab" || view === "practice-lab";
  elements.lessonShell.classList.toggle("lesson-shell--design-system", isDesignSystem);
  elements.lessonCard.classList.toggle("lesson-card--design-system", isDesignSystem);
  elements.lessonShell.classList.toggle("lesson-shell--ui-lab", isUiLab);
  elements.lessonCard.classList.toggle("lesson-card--ui-lab", isUiLab);
  elements.lessonStatus.hidden = isUiLab;
}

function updateNavigation(selectedItem) {
  elements.navigationItems.forEach((item) => {
    const isActive = item === selectedItem;
    item.classList.toggle("active", isActive);
    if (isActive) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
}

function selectPage(selectedItem, { historyMode = "push", restorePath = false } = {}) {
  resetWeekTheme();
  lessonRequest += 1;
  disposeActiveContent();
  elements.lessonContent.replaceChildren();
  elements.lessonContent.removeAttribute("aria-busy");
  const page = selectedItem.dataset.page;
  const isLearnPage = page === "learn";
  const isMorePage = page === "more";
  const isCourseVisible = !elements.main.classList.contains("lesson-mode") && !elements.main.classList.contains("coming-mode");
  if (historyMode === "push" && !isLearnPage && isCourseVisible) pathScrollPosition = window.scrollY;
  activeLessonDay = null;
  lessonOpener = null;
  document.title = APP_TITLE;
  const routeChanged = writeRoute({ page }, historyMode);
  updateNavigation(selectedItem);
  elements.main.classList.toggle("coming-mode", !isLearnPage);
  elements.main.classList.remove("lesson-mode");
  elements.comingSoon.classList.toggle("is-visible", !isLearnPage);
  elements.comingSoon.classList.toggle("is-more", isMorePage);
  elements.lessonView.classList.remove("is-visible");
  setDevelopmentViewMode();
  elements.moreTabs.hidden = !isMorePage;
  elements.comingSoon.querySelector(".coming-soon-title").hidden = isMorePage;
  elements.comingSoon.querySelector(".coming-soon-copy").hidden = isMorePage;
  if (overviewDialog.isOpen) overviewDialog.close({ restoreFocus:false });
  if (isLearnPage && (restorePath || (historyMode === "push" && routeChanged))) {
    window.requestAnimationFrame(() => window.scrollTo({ top:pathScrollPosition, behavior:"auto" }));
  }
}

async function openLesson(day, opener = null, { historyMode = "push", focusContent = false } = {}) {
  if (!Number.isInteger(day) || day < 1 || day > TOTAL_DAYS) return;
  applyWeekThemeForDay(day);
  const request = ++lessonRequest;
  if (opener) {
    lessonOpener = opener;
    pathScrollPosition = window.scrollY;
  }
  activeLessonDay = day;

  disposeActiveContent();
  setDevelopmentViewMode();
  elements.lessonTitle.textContent = `DAY ${day}`;
  elements.lessonStatus.textContent = "IN PROGRESS";
  elements.lessonContent.setAttribute("aria-busy", "true");
  document.title = renderLessonLoading(elements.lessonContent, day);
  showContentView();
  writeRoute({ day }, historyMode);
  if (overviewDialog.isOpen) overviewDialog.close({ restoreFocus:false });
  window.scrollTo({ top:0, behavior:prefersReducedMotion() ? "auto" : "smooth" });
  if (opener || focusContent) elements.lessonContent.focus({ preventScroll:true });

  try {
    const lesson = await loadLesson(day);
    if (request !== lessonRequest) return;
    const savedProgress = progressStore.getLessonProgress(day);
    const result = renderLesson(elements.lessonContent, day, lesson, {
      progress:savedProgress,
      onProgress({ completedStepIds, isComplete }) {
        const saved = progressController.saveLessonProgress(day, { completedStepIds, isComplete });
        elements.lessonStatus.textContent = saved.completedAt ? "COMPLETE" : "IN PROGRESS";
      },
    });
    const hasCurrentCompletion = Boolean(lesson)
      && Boolean(savedProgress.completedAt)
      && lesson.steps.every((step) => savedProgress.completedStepIds.includes(step.id));
    elements.lessonStatus.textContent = hasCurrentCompletion ? "COMPLETE" : "IN PROGRESS";
    elements.lessonContent.setAttribute("aria-busy", "false");
    document.title = result.title;
    useContentLifecycle(result);
    if (opener || focusContent) elements.lessonContent.focus({ preventScroll:true });
  } catch (error) {
    if (request !== lessonRequest) return;
    console.error(`Day ${day} could not be loaded.`, error);
    const result = renderLessonError(elements.lessonContent, day, () => {
      void openLesson(day, null, { historyMode:"none", focusContent:true });
    });
    elements.lessonStatus.textContent = "UNAVAILABLE";
    elements.lessonContent.setAttribute("aria-busy", "false");
    document.title = result.title;
    useContentLifecycle(result);
  }
}

async function openDesignSystem(opener = null, { historyMode = "push" } = {}) {
  if (!DEVELOPMENT_GALLERY_ENABLED) return;
  const request = ++lessonRequest;
  if (opener) {
    lessonOpener = opener;
    pathScrollPosition = window.scrollY;
  }
  activeLessonDay = null;
  disposeActiveContent();
  setDevelopmentViewMode("design-system");
  elements.lessonTitle.textContent = "DESIGN SYSTEM";
  elements.lessonStatus.textContent = "LOADING";
  elements.lessonContent.setAttribute("aria-busy", "true");
  elements.lessonContent.innerHTML = `<p role="status" aria-live="polite">Loading the previous Design System…</p>`;
  document.title = `Loading Design System · ${APP_TITLE}`;
  showContentView();
  writeRoute({ view:"design-system" }, historyMode);
  if (overviewDialog.isOpen) overviewDialog.close({ restoreFocus:false });
  window.scrollTo({ top:0, behavior:prefersReducedMotion() ? "auto" : "smooth" });
  try {
    const { renderDesignSystem } = await loadDesignSystem();
    if (request !== lessonRequest) return;
    elements.lessonContent.setAttribute("aria-busy", "false");
    elements.lessonStatus.textContent = "REFERENCE";
    const destroy = renderDesignSystem(elements.lessonContent);
    activeContentCleanup = typeof destroy === "function" ? destroy : () => {};
    document.title = `Design System · ${APP_TITLE}`;
    if (opener) elements.lessonContent.focus({ preventScroll:true });
  } catch (error) {
    if (request !== lessonRequest) return;
    console.error("The Design System could not be loaded.", error);
    elements.lessonContent.setAttribute("aria-busy", "false");
    elements.lessonStatus.textContent = "UNAVAILABLE";
    elements.lessonContent.innerHTML = `<section class="lesson-error" role="alert"><h1 class="lesson-heading">The Design System could not load</h1><p>Return to the path and try opening it again.</p></section>`;
    elements.lessonContent.focus({ preventScroll:true });
  }
}

async function openUiLab(opener = null, { historyMode = "push", view = "ui-lab" } = {}) {
  const shipReadyTemplate = getShipReadyTemplate(view);
  if (!shipReadyTemplate) return;
  applyWeekThemeFromSearch();
  const request = ++lessonRequest;
  if (opener) {
    lessonOpener = opener;
    pathScrollPosition = window.scrollY;
  }
  activeLessonDay = null;
  disposeActiveContent();
  setDevelopmentViewMode(shipReadyTemplate.renderer === "code" ? "practice-lab" : "ui-lab");
  elements.lessonTitle.textContent = shipReadyTemplate.chromeTitle;
  showContentView();
  writeRoute({ view }, historyMode);
  document.title = `Ship Ready · ${APP_TITLE}`;
  if (shipReadyTemplate.renderer === "code") {
    elements.lessonContent.setAttribute("aria-busy", "true");
    elements.lessonContent.innerHTML = `<p role="status" aria-live="polite">Loading Code Editor template…</p>`;
    try {
      const { renderDesignSystem } = await loadDesignSystem();
      if (request !== lessonRequest) return;
      const previousBackText = elements.lessonBackButton.textContent;
      const previousBackLabel = elements.lessonBackButton.getAttribute("aria-label");
      elements.lessonBackButton.textContent = "×";
      elements.lessonBackButton.setAttribute("aria-label", "Close lesson");
      elements.lessonContent.setAttribute("aria-busy", "false");
      document.body.classList.add("ui-lab-open", "ui-lab-template-open");
      const destroyPracticeLab = renderDesignSystem(elements.lessonContent, { practiceOnly:true, practice:shipReadyTemplate.content });
      activeContentCleanup = () => {
        destroyPracticeLab();
        document.body.classList.remove("ui-lab-template-open", "ui-lab-open");
        elements.lessonBackButton.textContent = previousBackText;
        if (previousBackLabel === null) elements.lessonBackButton.removeAttribute("aria-label");
        else elements.lessonBackButton.setAttribute("aria-label", previousBackLabel);
      };
    } catch (error) {
      if (request !== lessonRequest) return;
      console.error("The Code Editor template could not be loaded.", error);
      elements.lessonContent.setAttribute("aria-busy", "false");
      elements.lessonContent.innerHTML = `<section class="lesson-error" role="alert"><h1 class="lesson-heading">The Code Editor template could not load</h1><p>Return to Ship Ready and try opening it again.</p></section>`;
    }
  } else {
    elements.lessonContent.removeAttribute("aria-busy");
    activeContentCleanup = shipReadyTemplate.renderer === "markdown" ? renderMarkdownLab(elements.lessonContent)
      : renderUiLab(elements.lessonContent, { definition:shipReadyTemplate });
  }
  window.scrollTo({ top:0, behavior:"auto" });
  if (opener) elements.lessonContent.focus({ preventScroll:true });
}

function showUiLabLibrary(tab) {
  const panel = getRequiredElement(`#${tab.getAttribute("aria-controls")}`);
  renderUiLabLibrary(panel, { onOpenMarkdown(opener) { void openUiLab(opener, { view:"ship-ready-markdown" }); } });
}

const moreTabs = createMoreTabs(elements.moreTabs, {
  onUiLab:showUiLabLibrary,
  onShipReady(tab) {
    const panel = getRequiredElement(`#${tab.getAttribute("aria-controls")}`);
    renderShipReadyLibrary(panel, { onOpenTemplate(opener, view) { void openUiLab(opener, { view }); } });
  },
  onDesignSystem(tab) { if (DEVELOPMENT_GALLERY_ENABLED) void openDesignSystem(tab); },
});
showUiLabLibrary(moreTabs.uiLabTab);
function closeLesson() {
  const returnDay = activeLessonDay;
  const wasDesignSystem = elements.lessonShell.classList.contains("lesson-shell--design-system");
  const wasUiLab = elements.lessonShell.classList.contains("lesson-shell--ui-lab");
  if ((wasDesignSystem || wasUiLab) && activeLessonDay === null) {
    const route = readRoute(window.location.search);
    const templateTab = isShipReadyRoute(route.view) ? moreTabs.shipReadyTab : moreTabs.uiLabTab;
    const returnTarget = lessonOpener || (route.view === "design-system" ? moreTabs.designSystemTab : templateTab);
    const moreItem = elements.navigationItems.find((item) => item.dataset.page === "more");
    selectPage(moreItem, { historyMode:"replace" });
    window.requestAnimationFrame(() => returnTarget?.focus({ preventScroll:true }));
    return;
  }
  lessonRequest += 1;
  disposeActiveContent();
  elements.main.classList.remove("lesson-mode");
  elements.lessonView.classList.remove("is-visible");
  setDevelopmentViewMode();
  elements.lessonContent.replaceChildren();
  elements.lessonContent.removeAttribute("aria-busy");
  activeLessonDay = null;
  document.title = APP_TITLE;
  writeRoute({ page:"learn" }, "replace");
  window.scrollTo({ top:pathScrollPosition, behavior:prefersReducedMotion() ? "auto" : "smooth" });
  const routeTarget = returnDay ? elements.courseUnits.querySelector(`[data-day="${returnDay}"]`) : null;
  const returnTarget = lessonOpener || routeTarget || elements.courseUnits.querySelector('[data-day="1"]') || elements.navigationItems[0];
  lessonOpener = null;
  window.requestAnimationFrame(() => returnTarget?.focus({ preventScroll:true }));
}
function applyCurrentRoute({ restorePath = false } = {}) {
  const route = readRoute(window.location.search);
  if (route.page !== "learn") {
    const item = elements.navigationItems.find((navigationItem) => navigationItem.dataset.page === route.page);
    selectPage(item || elements.navigationItems[0], { historyMode:"none", restorePath });
    return;
  }
  if (route.view === "design-system") {
    if (DEVELOPMENT_GALLERY_ENABLED) void openDesignSystem(null, { historyMode:"none" });
    else {
      writeRoute({ page:"learn" }, "replace");
      selectPage(elements.navigationItems[0], { historyMode:"none", restorePath });
    }
    return;
  }
  if (isShipReadyRoute(route.view)) {
    openUiLab(null, { historyMode:"none", view:route.view });
    return;
  }
  if (Number.isInteger(route.day) && route.day >= 1 && route.day <= TOTAL_DAYS) {
    void openLesson(route.day, null, { historyMode:"none" });
    return;
  }
  if (route.day !== null) writeRoute({ page:"learn" }, "replace");
  selectPage(elements.navigationItems[0], { historyMode:"none", restorePath });
}

elements.lessonBackButton.addEventListener("click", closeLesson);
elements.navigationItems.forEach((item) => item.addEventListener("click", () => selectPage(item)));
elements.courseUnits.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const dayTrigger = event.target.closest("[data-day]");
  if (dayTrigger) void openLesson(Number(dayTrigger.dataset.day), dayTrigger);
});

window.addEventListener("popstate", () => applyCurrentRoute({ restorePath:true }));
window.matchMedia("(max-width:900px)").addEventListener("change", (event) => {
  if (!event.matches && overviewDialog.isOpen) overviewDialog.close({ restoreFocus:false });
});

window.history.replaceState(
  { ...(window.history.state || {}), fullStackQuest:true },
  "",
  createRouteUrl(window.location.href, readRoute(window.location.search)),
);
applyCurrentRoute();
