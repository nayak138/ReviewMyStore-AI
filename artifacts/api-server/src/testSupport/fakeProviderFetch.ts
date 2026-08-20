/**
 * Installs a fake `globalThis.fetch` at module-load time so provider calls
 * (BNDLE, OpenRouter) made by services under test never reach the network.
 *
 * Import this module BEFORE any module that constructs an OpenAI client —
 * the SDK captures a reference to `globalThis.fetch` in its constructor, so
 * patching later (e.g. in a `before()` hook) is too late.
 */

export const BNDLE_BASE =
  process.env.BNDLE_SOCIAL_BASE_URL?.replace(/\/$/, "") ??
  "https://api.bundle.social";

export type RecordedCall = { url: string; method: string; body: unknown };
export type FakeResult = { status?: number; body?: unknown };

export const recorded: RecordedCall[] = [];

export const providerFetch: {
  handler: (url: URL, init: RequestInit) => FakeResult | undefined;
} = {
  handler: () => ({ body: {} }),
};

const realFetch = globalThis.fetch;

export function restoreFetch() {
  globalThis.fetch = realFetch;
}

export function bndleCalls() {
  return recorded.filter((call) => call.url.startsWith(BNDLE_BASE));
}

export function resetCalls() {
  recorded.length = 0;
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

globalThis.fetch = (async (
  input: string | URL | Request,
  init: RequestInit = {},
) => {
  const urlStr =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const method = (
    init.method ?? (input instanceof Request ? input.method : "GET")
  ).toUpperCase();
  let body: unknown = null;
  if (typeof init.body === "string") {
    try {
      body = JSON.parse(init.body);
    } catch {
      body = init.body;
    }
  }
  recorded.push({ url: urlStr, method, body });

  if (urlStr.startsWith(BNDLE_BASE)) {
    const result = providerFetch.handler(new URL(urlStr), init) ?? { body: {} };
    return jsonResponse(result.status ?? 200, result.body ?? {});
  }
  if (new URL(urlStr).pathname.endsWith("/chat/completions")) {
    // Fake OpenRouter so draft-generation tests never hit the network.
    return jsonResponse(200, {
      id: "cmpl_test",
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "test-model",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content:
              "Thank you for your feedback — we appreciate you taking the time to share it.",
          },
          finish_reason: "stop",
        },
      ],
    });
  }
  throw new Error(`Unexpected fetch in test: ${method} ${urlStr}`);
}) as typeof fetch;
