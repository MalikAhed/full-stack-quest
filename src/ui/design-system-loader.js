const stylesheetPromises = new Map();
let designSystemPromise;

function loadStylesheet(href, { before = null, optional = false } = {}) {
  if (stylesheetPromises.has(href)) return stylesheetPromises.get(href);
  const promise = new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.lazyStylesheet = "true";
    link.dataset.loadState = "loading";
    link.addEventListener("load", () => {
      link.dataset.loadState = "loaded";
      resolve(link);
    }, { once:true });
    link.addEventListener("error", () => {
      link.dataset.loadState = "error";
      link.remove();
      reject(new Error(`Could not load ${href}`));
    }, { once:true });
    if (before) before.before(link);
    else document.head.append(link);
  }).catch((error) => {
    stylesheetPromises.delete(href);
    if (!optional) throw error;
    console.warn(error.message);
    return null;
  });
  stylesheetPromises.set(href, promise);
  return promise;
}

export function loadDesignSystem() {
  if (!designSystemPromise) {
    const sidebarStyles = document.querySelector('link[href="src/styles/sidebar.css"]');
    designSystemPromise = Promise.all([
      import("./design-system-view.js"),
      loadStylesheet("src/styles/design-system.css", { before:sidebarStyles }),
      loadStylesheet("https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Lilita+One&family=Rowdies:wght@700&family=Titan+One&display=swap", { optional:true }),
    ]).then(([module]) => module).catch((error) => {
      designSystemPromise = undefined;
      throw error;
    });
  }
  return designSystemPromise;
}
