import assert from "node:assert/strict";
import test from "node:test";
import { createRouteUrl, readRoute } from "../src/app/route.js";

test("route parser accepts only known pages and strict positive-looking day values", () => {
  assert.deepEqual(readRoute("?page=shop"), { page:"shop", day:null, view:null });
  assert.deepEqual(readRoute("?page=unknown&day=7"), { page:"learn", day:7, view:null });
  assert.deepEqual(readRoute("?day=7x"), { page:"learn", day:null, view:null });
  assert.deepEqual(readRoute("?day=0"), { page:"learn", day:null, view:null });
  assert.deepEqual(readRoute("?day=007"), { page:"learn", day:null, view:null });
  assert.deepEqual(readRoute(`?day=${Number.MAX_SAFE_INTEGER + 1}`), { page:"learn", day:null, view:null });
  assert.deepEqual(readRoute("?view=lesson-studio&day=4"), { page:"learn", day:4, view:null });
  assert.deepEqual(readRoute("?view=design-system"), { page:"learn", day:null, view:"design-system" });
  assert.deepEqual(readRoute("?view=ui-lab"), { page:"learn", day:null, view:null });
  assert.deepEqual(readRoute("?view=ship-ready-markdown"), { page:"learn", day:null, view:"ship-ready-markdown" });
  assert.deepEqual(readRoute("?view=ship-ready-sequence"), { page:"learn", day:null, view:"ship-ready-sequence" });
  assert.deepEqual(readRoute("?view=ship-ready-fill-blanks"), { page:"learn", day:null, view:"ship-ready-fill-blanks" });
  assert.deepEqual(readRoute("?view=ship-ready-response"), { page:"learn", day:null, view:"ship-ready-response" });
  assert.deepEqual(readRoute("?view=ship-ready-spot-bug"), { page:"learn", day:null, view:"ship-ready-spot-bug" });
  assert.deepEqual(readRoute("?view=ship-ready-code-lab"), { page:"learn", day:null, view:"ship-ready-code-lab" });
});

test("route URL updates preserve unrelated query parameters", () => {
  const lesson = createRouteUrl("https://example.test/?campaign=quest&page=more", { day:12 });
  assert.equal(lesson.search, "?campaign=quest&day=12");
  const page = createRouteUrl(lesson, { page:"more" });
  assert.equal(page.search, "?campaign=quest&page=more");
  assert.equal(createRouteUrl(page, { day:Number.MAX_SAFE_INTEGER + 1 }).search, "?campaign=quest");
  assert.equal(createRouteUrl(page, { view:"design-system" }).search, "?campaign=quest&view=design-system");
  assert.equal(createRouteUrl(page, { view:"ui-lab" }).search, "?campaign=quest");
  assert.equal(createRouteUrl(page, { view:"ship-ready-markdown" }).search, "?campaign=quest&view=ship-ready-markdown");
  assert.equal(createRouteUrl(page, { view:"ship-ready-sequence" }).search, "?campaign=quest&view=ship-ready-sequence");
  assert.equal(createRouteUrl(page, { view:"ship-ready-fill-blanks" }).search, "?campaign=quest&view=ship-ready-fill-blanks");
  assert.equal(createRouteUrl(page, { view:"ship-ready-response" }).search, "?campaign=quest&view=ship-ready-response");
  assert.equal(createRouteUrl(page, { view:"ship-ready-spot-bug" }).search, "?campaign=quest&view=ship-ready-spot-bug");
  assert.equal(createRouteUrl(page, { view:"ship-ready-code-lab" }).search, "?campaign=quest&view=ship-ready-code-lab");
});
