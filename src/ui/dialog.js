const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function getFocusableElements(root) {
  return [...root.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => {
    return !element.hidden
      && element.getAttribute("aria-hidden") !== "true"
      && !element.closest("[inert]")
      && element.getClientRects().length > 0;
  });
}

export function trapTabKey(event, root) {
  if (event.key !== "Tab") return false;
  const focusable = getFocusableElements(root);
  if (focusable.length === 0) {
    event.preventDefault();
    root.focus({ preventScroll:true });
    return true;
  }

  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}

export function createDialogController({
  root,
  trigger,
  backdrop,
  closeButton,
  inactiveElements = [],
  bodyClass = "dialog-open",
}) {
  const controller = new AbortController();
  let isOpen = false;
  const previousInertValues = new Map();

  const setBackgroundInert = (inert) => {
    inactiveElements.forEach((element) => {
      if (inert) {
        previousInertValues.set(element, element.inert);
        element.inert = true;
      } else {
        element.inert = previousInertValues.get(element) ?? false;
      }
    });
    if (!inert) previousInertValues.clear();
  };

  const handleKeydown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    trapTabKey(event, root);
  };

  function open() {
    if (isOpen) return;
    isOpen = true;
    root.classList.add("is-open");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("tabindex", "-1");
    backdrop.classList.add("is-active");
    backdrop.setAttribute("aria-hidden", "false");
    trigger.setAttribute("aria-expanded", "true");
    document.body.classList.add(bodyClass);
    setBackgroundInert(true);
    document.addEventListener("keydown", handleKeydown);
    closeButton.focus({ preventScroll:true });
  }

  function close({ restoreFocus = true } = {}) {
    if (!isOpen) return;
    isOpen = false;
    root.classList.remove("is-open");
    root.removeAttribute("role");
    root.removeAttribute("aria-modal");
    root.removeAttribute("tabindex");
    backdrop.classList.remove("is-active");
    backdrop.setAttribute("aria-hidden", "true");
    trigger.setAttribute("aria-expanded", "false");
    document.body.classList.remove(bodyClass);
    setBackgroundInert(false);
    document.removeEventListener("keydown", handleKeydown);
    if (restoreFocus) trigger.focus({ preventScroll:true });
  }

  trigger.addEventListener("click", open, { signal:controller.signal });
  closeButton.addEventListener("click", () => close(), { signal:controller.signal });
  backdrop.addEventListener("click", () => close(), { signal:controller.signal });

  return Object.freeze({
    open,
    close,
    destroy() {
      close({ restoreFocus:false });
      controller.abort();
    },
    get isOpen() { return isOpen; },
  });
}
