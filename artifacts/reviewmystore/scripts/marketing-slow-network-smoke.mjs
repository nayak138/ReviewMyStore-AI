import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const projectDir = new URL("..", import.meta.url);
const chromiumPath = process.env.CHROMIUM_PATH ?? "/repl/tools/bin/chromium";

async function getAvailablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
}

async function waitForPreview(url, server, getOutput) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20_000) {
    if (server.exitCode !== null) {
      throw new Error(`Preview server exited early.\n${getOutput()}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite has not bound the preview port yet.
    }
    await delay(150);
  }
  throw new Error(`Preview server did not become ready.\n${getOutput()}`);
}

const port = await getAvailablePort();
const previewUrl = `http://127.0.0.1:${port}/`;
const preview = spawn(
  "pnpm",
  [
    "exec",
    "vite",
    "preview",
    "--config",
    "vite.config.ts",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ],
  {
    cwd: projectDir,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let previewOutput = "";
preview.stdout.on("data", (chunk) => {
  previewOutput += chunk.toString();
});
preview.stderr.on("data", (chunk) => {
  previewOutput += chunk.toString();
});

let browser;
let releaseTrialChunk;
try {
  await waitForPreview(previewUrl, preview, () => previewOutput);

  browser = await chromium.launch({
    headless: true,
    ...(existsSync(chromiumPath) ? { executablePath: chromiumPath } : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);

  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 300,
    downloadThroughput: 64 * 1024,
    uploadThroughput: 32 * 1024,
    connectionType: "cellular3g",
  });

  let holdTrialChunk = false;
  let trialChunkRequested = false;
  let notifyTrialChunkRequested;
  const trialChunkRequest = new Promise((resolve) => {
    notifyTrialChunkRequested = resolve;
  });
  let notifyReleaseTrialChunk;
  const trialChunkGate = new Promise((resolve) => {
    notifyReleaseTrialChunk = resolve;
  });
  releaseTrialChunk = notifyReleaseTrialChunk;

  await page.route("**/*.js", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (holdTrialChunk && pathname.includes("book-demo-dialog")) {
      trialChunkRequested = true;
      notifyTrialChunkRequested();
      await trialChunkGate;
    }
    await route.continue();
  });

  await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Your reputation deserves a system." }).waitFor();
  await page.getByTestId("panel-customer").waitFor();
  assert.equal(
    await page.getByTestId("experience-tab-customer").getAttribute("aria-selected"),
    "true",
    "the customer demo should be the initially available experience",
  );

  // Interacting with the prerendered language control proves React hydrated
  // the homepage and mounted the live customer demo on the throttled connection.
  await page.getByRole("button", { name: "Choose language" }).click();
  await page.getByRole("listbox").waitFor();
  await page.getByRole("option", { name: /हिन्दी/ }).click();
  const demo = page.locator("#review-demo");
  await page.getByRole("radiogroup", { name: "आपका अनुभव कैसा रहा?" }).waitFor();
  assert.notEqual(await demo.getAttribute("dir"), "rtl");

  const selectedRating = page.getByRole("radio", { name: "4 stars" });
  await selectedRating.click();
  await page.getByRole("button", { name: "Beautiful views" }).click();
  const translatedDetail = page.getByRole("textbox", {
    name: "किसी टीम सदस्य, डिश या चीज़ का ज़िक्र करें (वैकल्पिक)",
  });
  await translatedDetail.fill("Great service");

  const trialButton = page.getByTestId("button-hero-trial");
  await trialButton.scrollIntoViewIfNeeded();
  holdTrialChunk = true;
  await trialButton.click();
  await trialButton.waitFor({ state: "attached" });
  await trialChunkRequest;
  assert.equal(trialChunkRequested, true, "the trial dialog must be loaded as a separate chunk");
  await page.getByRole("status").filter({ hasText: "Loading guided trial request form" }).waitFor();
  assert.equal(await trialButton.getAttribute("aria-busy"), "true");
  assert.equal(await page.getByRole("dialog").count(), 0);

  // The user can continue switching translated customer controls and the
  // separate business preview while the trial dialog's JavaScript is pending.
  await page.getByTestId("experience-tab-business").click();
  const businessSelect = page.getByTestId("select-sample-business");
  await businessSelect.selectOption({ index: 1 });
  await page.getByTestId("experience-tab-customer").click();
  await page.getByRole("radiogroup", { name: "आपका अनुभव कैसा रहा?" }).waitFor();
  assert.equal(await selectedRating.getAttribute("aria-checked"), "true");
  await page.getByRole("button", { name: "Beautiful views" }).waitFor();
  assert.equal(await translatedDetail.inputValue(), "Great service");
  assert.equal(await trialButton.getAttribute("aria-busy"), "true");

  releaseTrialChunk();
  releaseTrialChunk = undefined;
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible" });
  await dialog.getByRole("heading", { name: "Request a guided 7-day trial" }).waitFor();
  await dialog.getByTestId("input-trial-name").waitFor();
  assert.equal(
    await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))),
    true,
    "opening the loaded dialog should move keyboard focus inside it",
  );

  await dialog.getByRole("button", { name: "Close" }).click();
  const trialButtonHandle = await trialButton.elementHandle();
  await page.waitForFunction(
    (element) => element === document.activeElement,
    trialButtonHandle,
  );

  await context.close();
  console.log("Slow-network marketing smoke test passed.");
} finally {
  releaseTrialChunk?.();
  await browser?.close();
  if (preview.exitCode === null) {
    preview.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => preview.once("exit", resolve)),
      delay(3_000),
    ]);
    if (preview.exitCode === null) preview.kill("SIGKILL");
  }
}