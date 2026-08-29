const PRISM_STYLE = {
  href:"https://cdn.jsdelivr.net/npm/prismjs@1.30.0/themes/prism-tomorrow.min.css",
  integrity:"sha384-wFjoQjtV1y5jVHbt0p35Ui8aV8GVpEZkyF99OXWqP/eNJDU93D3Ugxkoyh6Y2I4A",
};

const PRISM_SCRIPTS = [
  ["https://cdn.jsdelivr.net/npm/prismjs@1.30.0/components/prism-core.min.js", "sha384-zLRFO4dwowZvh8kzutOb5AWhH7f39HeJp+N7PtHF1SQtTBnifRx0AtmvTYs3F4YV"],
  ["https://cdn.jsdelivr.net/npm/prismjs@1.30.0/components/prism-clike.min.js", "sha384-7LHwxHIDSHTBleLmgDWZbC/IMJsfYfFVOihKhvsrxYW4j47YQcRwZja4ToFE3bA8"],
  ["https://cdn.jsdelivr.net/npm/prismjs@1.30.0/components/prism-javascript.min.js", "sha384-D44bgYYKvaiDh4cOGlj1dbSDpSctn2FSUj118HZGmZEShZcO2v//Q5vvhNy206pp"],
];

let prismPromise;

function loadStyle({ href, integrity }) {
  const existing = [...document.styleSheets].find((sheet) => sheet.href === href);
  if (existing) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.integrity = integrity;
    link.crossOrigin = "anonymous";
    link.referrerPolicy = "no-referrer";
    link.dataset.prismResource = "style";
    link.addEventListener("load", resolve, { once:true });
    link.addEventListener("error", () => {
      link.remove();
      reject(new Error(`Could not load ${href}`));
    }, { once:true });
    document.head.append(link);
  });
}

function loadScript([src, integrity]) {
  const existing = [...document.scripts].find((script) => script.src === src);
  if (existing?.dataset.loaded === "true") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = existing || document.createElement("script");
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    }, { once:true });
    script.addEventListener("error", () => {
      if (script.dataset.prismResource === "script") script.remove();
      reject(new Error(`Could not load ${src}`));
    }, { once:true });
    if (existing) return;
    script.src = src;
    script.integrity = integrity;
    script.crossOrigin = "anonymous";
    script.referrerPolicy = "no-referrer";
    script.dataset.prismResource = "script";
    document.head.append(script);
  });
}

export function ensurePrism() {
  if (window.Prism?.languages?.javascript) return Promise.resolve(true);
  if (window.__FULL_STACK_QUEST_DISABLE_EXTERNALS__) return Promise.resolve(false);
  if (!prismPromise) {
    prismPromise = (async () => {
      const stylePromise = loadStyle(PRISM_STYLE);
      for (const script of PRISM_SCRIPTS) await loadScript(script);
      await stylePromise;
      return Boolean(window.Prism);
    })().catch((error) => {
      prismPromise = undefined;
      throw error;
    });
  }
  return prismPromise;
}

export function highlightCode(container, signal) {
  void ensurePrism().then((available) => {
    if (!available || signal.aborted || !container.isConnected) return;
    container.querySelectorAll('.lesson-code pre code[class*="language-"]').forEach((code) => window.Prism.highlightElement(code));
  }).catch((error) => console.error("Syntax highlighting could not be loaded.", error));
}
