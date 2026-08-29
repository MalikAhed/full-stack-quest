import { isShipReadyRoute } from "../data/ship-ready.js";

const APP_PAGES = new Set(["learn", "shop", "more"]);

export function readRoute(search = "") {
  const params = new URLSearchParams(search);
  const page = APP_PAGES.has(params.get("page")) ? params.get("page") : "learn";
  if (page !== "learn") return { page, day:null, view:null };

  if (params.get("view") === "design-system" || isShipReadyRoute(params.get("view"))) {
    return { page:"learn", day:null, view:params.get("view") };
  }

  const rawDay = params.get("day");
  const parsedDay = rawDay && /^[1-9]\d*$/.test(rawDay) ? Number(rawDay) : null;
  const day = Number.isSafeInteger(parsedDay) ? parsedDay : null;
  return { page:"learn", day, view:null };
}

export function createRouteUrl(currentHref, { page = "learn", day = null, view = null } = {}) {
  const url = new URL(currentHref);
  url.searchParams.delete("page");
  url.searchParams.delete("day");
  url.searchParams.delete("view");

  if (page !== "learn" && APP_PAGES.has(page)) {
    url.searchParams.set("page", page);
  } else if (view === "design-system" || isShipReadyRoute(view)) {
    url.searchParams.set("view", view);
  } else if (Number.isSafeInteger(day) && day > 0) {
    url.searchParams.set("day", String(day));
  }
  return url;
}
