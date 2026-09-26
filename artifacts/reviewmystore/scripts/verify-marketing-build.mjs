import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { gzipSync } from "node:zlib";
import { JSDOM } from "jsdom";

const root = fileURLToPath(new URL("../dist/public/", import.meta.url));
// Leaves roughly 30% headroom over the current 153.45 kB gzip baseline.
const maxHomepageEntryGzipBytes = 200 * 1024;
// Leaves about 37% headroom over the current 29.21 KiB gzip stylesheet baseline.
const maxHomepageStylesheetGzipBytes = 40 * 1024;
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

const homepageHtml = await readFile(path.join(root, "index.html"), "utf8");
const homepage = new JSDOM(homepageHtml).window.document;
const entryScripts = homepage.querySelectorAll('script[type="module"][src]');
assert.equal(entryScripts.length, 1, "Homepage must reference exactly one module entry script");

// Resolve only assets referenced by the homepage, not deferred route/form chunks.
const buildOrigin = "https://marketing-build.invalid/";
const entryUrl = new URL(entryScripts[0].getAttribute("src"), buildOrigin);
const configuredBase = new URL(process.env.BASE_PATH || "/", buildOrigin);
function homepageAssetPath(reference, description) {
  let assetPathname = decodeURIComponent(new URL(reference, buildOrigin).pathname);
  if (configuredBase.pathname !== "/" && assetPathname.startsWith(configuredBase.pathname)) {
    assetPathname = assetPathname.slice(configuredBase.pathname.length);
  }
  const assetPath = path.resolve(root, `.${path.sep}${assetPathname.replace(/^\/+/, "")}`);
  assert(
    assetPath.startsWith(`${path.resolve(root)}${path.sep}`),
    `Homepage ${description} must resolve to an asset inside dist/public`,
  );
  return assetPath;
}
const entryPath = homepageAssetPath(entryScripts[0].getAttribute("src"), "entry script");
const entryBytes = await readFile(entryPath);
const entryGzipBytes = gzipSync(entryBytes).byteLength;
assert(
  entryGzipBytes <= maxHomepageEntryGzipBytes,
  `Homepage entry script is ${Math.round(entryGzipBytes / 1024)} KiB gzip; budget is ${Math.round(maxHomepageEntryGzipBytes / 1024)} KiB`,
);
console.log(
  `Homepage entry script: ${(entryBytes.byteLength / 1000).toFixed(2)} kB raw, ${(entryGzipBytes / 1024).toFixed(2)} KiB gzip (200 KiB budget).`,
);

const homepageStylesheets = homepage.querySelectorAll('link[rel="stylesheet"][href]');
assert(homepageStylesheets.length > 0, "Homepage must reference at least one stylesheet");
const stylesheetSizes = await Promise.all(Array.from(homepageStylesheets, async (stylesheet) => {
  const stylesheetPath = homepageAssetPath(stylesheet.getAttribute("href"), "stylesheet");
  const bytes = await readFile(stylesheetPath);
  return { rawBytes: bytes.byteLength, gzipBytes: gzipSync(bytes).byteLength };
}));
const stylesheetRawBytes = stylesheetSizes.reduce((total, size) => total + size.rawBytes, 0);
const stylesheetGzipBytes = stylesheetSizes.reduce((total, size) => total + size.gzipBytes, 0);
assert(
  stylesheetGzipBytes <= maxHomepageStylesheetGzipBytes,
  `Homepage stylesheets are ${(stylesheetGzipBytes / 1024).toFixed(2)} KiB gzip; budget is ${Math.round(maxHomepageStylesheetGzipBytes / 1024)} KiB`,
);
console.log(
  `Homepage stylesheets: ${(stylesheetRawBytes / 1000).toFixed(2)} kB raw, ${(stylesheetGzipBytes / 1024).toFixed(2)} KiB gzip (40 KiB budget).`,
);

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