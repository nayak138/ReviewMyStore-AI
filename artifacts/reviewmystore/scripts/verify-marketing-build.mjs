import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { JSDOM } from "jsdom";

const root = fileURLToPath(new URL("../dist/public/", import.meta.url));
async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(file);
    return entry.name === "index.html" ? [file] : [];
  }));
  return nested.flat();
}

const files = await htmlFiles(root);
assert(files.length >= 6, "Build must emit all public marketing routes");
const titles = new Set();
const sections = ["top", "experience", "proof", "approach", "features", "how-it-works", "walkthrough", "comparison", "tools", "agencies", "trial", "pricing", "stories", "faq", "start"];

for (const file of files) {
  const html = await readFile(file, "utf8");
  const route = `/${path.relative(root, path.dirname(file)).split(path.sep).join("/")}`;
  const document = new JSDOM(html).window.document;
  const content = document.querySelector("#root");
  assert(content?.textContent.trim().length > 300, `${route}: meaningful body before hydration`);
  assert.equal(content.querySelectorAll("h1").length, 1, `${route}: exactly one H1`);
  assert(!titles.has(document.title), `${route}: unique title`);
  titles.add(document.title);
  assert(document.querySelector('meta[name="description"]')?.content.length > 40, `${route}: description`);
  for (const name of ["og:title", "og:description", "og:url", "og:image"]) {
    assert.equal(document.querySelectorAll(`meta[property="${name}"]`).length, 1, `${route}: single ${name}`);
  }
  assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1, `${route}: single canonical`);
  const canonical = new URL(document.querySelector('link[rel="canonical"]').href);
  assert.equal(canonical.pathname, route, `${route}: canonical path`);
  assert(!canonical.hostname.endsWith(".replit.dev"), "Never publish development canonical URLs");
  assert.equal(document.querySelector('meta[property="og:url"]').content, canonical.href);
  assert(content.querySelector('a[href="/terms"]'), `${route}: legal navigation`);
  assert(content.querySelector('a[href="https://docs.5-star.ai/"]'), `${route}: public docs`);
  const schemas = Array.from(document.querySelectorAll('script[type="application/ld+json"]'), (script) => JSON.parse(script.textContent));
  for (const schema of schemas) {
    assert(!schema.aggregateRating && !schema.review, `${route}: no fabricated reputation schema`);
    if (schema["@type"] === "SoftwareApplication") assert(!schema.offers, "Custom quote service must not advertise a free public price");
  }
  if (route.startsWith("/blog/")) {
    assert.equal(schemas.filter((schema) => schema["@type"] === "BlogPosting").length, 1);
  }
  if (route === "/") {
    assert.equal(document.title, "5-Star.AI — Google Review & Reputation Management");
    assert.equal(content.querySelector("h1").textContent, "Your reputation deserves a system.");
    let previous = -1;
    for (const id of sections) {
      const position = html.indexOf(`id="${id}"`);
      assert(position > previous, `Homepage section order: ${id}`);
      previous = position;
    }
    assert.equal(content.querySelectorAll("#review-demo").length, 1, "One mounted customer demo");
    assert(content.textContent.includes("No Sign Up"));
    assert(content.textContent.includes("Sample data — not customer results"));
    assert(content.textContent.includes("written custom quote"));
    assert(content.querySelector(".marketing-dark.dark"), "Scoped dark homepage in static HTML");
  } else {
    assert(!content.querySelector(".marketing-dark"), `${route}: no forced homepage dark scope`);
  }
  const guard = Array.from(document.scripts).find((script) => script.textContent.includes('r.innerHTML=""'));
  assert(guard, `${route}: preserve non-marketing path guard`);
  for (const pathname of [route, route === "/" ? "/" : `${route}/`, "/dashboard", "/app/reviews"]) {
    const rootNode = { innerHTML: "prerendered" };
    vm.runInNewContext(guard.textContent, {
      location: { pathname },
      document: { getElementById: () => rootNode },
    });
    const expected = pathname.replace(/\/+$/, "") === route.replace(/\/+$/, "") ? "prerendered" : "";
    assert.equal(rootNode.innerHTML, expected, `${route}: fallback guard at ${pathname}`);
  }
}
console.log(`Verified ${files.length} prerendered marketing routes: body, headings, metadata, canonical, schema, navigation, ordered homepage and fallback guard.`);