import { getRequiredElement } from "../lib/dom.js";

export function createMoreTabs(root, { onDesignSystem, onShipReady, onUiLab }) {
  const tabs = [...root.querySelectorAll("[data-more-tab]")];

  function select(selectedTab, { focus = false } = {}) {
    tabs.forEach((tab) => {
      const isSelected = tab === selectedTab;
      tab.setAttribute("aria-selected", String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
      getRequiredElement(`#${tab.getAttribute("aria-controls")}`).hidden = !isSelected;
    });
    if (focus) selectedTab.focus();
    if (selectedTab.dataset.moreTab === "ui-lab") onUiLab(selectedTab);
    if (selectedTab.dataset.moreTab === "ship-ready") onShipReady(selectedTab);
    if (selectedTab.dataset.moreTab === "design-system") onDesignSystem(selectedTab);
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => select(tab)));
  root.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const currentIndex = tabs.indexOf(document.activeElement);
    if (currentIndex < 0) return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0
      : event.key === "End" ? tabs.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    select(tabs[nextIndex], { focus:true });
  });

  return {
    designSystemTab:tabs.find((tab) => tab.dataset.moreTab === "design-system"),
    shipReadyTab:tabs.find((tab) => tab.dataset.moreTab === "ship-ready"),
    uiLabTab:tabs.find((tab) => tab.dataset.moreTab === "ui-lab"),
  };
}
