import assert from "node:assert/strict";
import { test } from "node:test";
import {
  InvalidBusinessUrlError,
  normalizeBusinessUrls,
  safePublicHttpUrl,
  safePublicSocialUrl,
} from "./businessUrlValidation";

test("normalizes valid website and social profile URLs", () => {
  assert.deepEqual(
    normalizeBusinessUrls({
      website: " https://example.com/contact ",
      instagramUrl: "https://www.instagram.com/example",
      facebookUrl: "https://fb.com/example",
    }),
    {
      website: "https://example.com/contact",
      instagramUrl: "https://www.instagram.com/example",
      facebookUrl: "https://fb.com/example",
    },
  );
});

test("rejects unsafe schemes, credentialed URLs, and social lookalikes", () => {
  assert.throws(
    () => normalizeBusinessUrls({ website: "javascript:alert(1)" }),
    InvalidBusinessUrlError,
  );
  assert.throws(
    () =>
      normalizeBusinessUrls({ website: "https://owner:secret@example.com" }),
    InvalidBusinessUrlError,
  );
  assert.throws(
    () =>
      normalizeBusinessUrls({
        instagramUrl: "https://instagram.com.evil.test/x",
      }),
    InvalidBusinessUrlError,
  );
});

test("filters unsafe legacy links before public rendering", () => {
  assert.equal(safePublicHttpUrl("data:text/html,unsafe"), null);
  assert.equal(
    safePublicSocialUrl("https://facebook.com.evil.test/business", "facebook"),
    null,
  );
  assert.equal(
    safePublicSocialUrl("https://m.instagram.com/business", "instagram"),
    "https://m.instagram.com/business",
  );
});
