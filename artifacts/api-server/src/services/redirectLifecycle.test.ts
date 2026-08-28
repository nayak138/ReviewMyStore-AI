import assert from "node:assert/strict";
import { test } from "node:test";
import { isLiveRedirect } from "./redirectService";

const live = {
  linkActive: true,
  sourceType: "QR" as const,
  campaignStatus: "ACTIVE",
  businessStatus: "ACTIVE",
};

test("redirect resolution requires every campaign and business lifecycle check", () => {
  assert.equal(isLiveRedirect(live), true);
  for (const [field, value] of [
    ["campaignStatus", "DRAFT"],
    ["campaignStatus", "ARCHIVED"],
    ["campaignStatus", "DISABLED"],
    ["businessStatus", "SUSPENDED"],
    ["businessStatus", "DISABLED"],
  ] as const) {
    assert.equal(isLiveRedirect({ ...live, [field]: value }), false, field);
  }

  for (const field of [
    "campaignDeletedAt",
    "campaignArchivedAt",
    "businessDeletedAt",
    "businessArchivedAt",
  ] as const) {
    assert.equal(
      isLiveRedirect({ ...live, [field]: new Date() }),
      false,
      field,
    );
  }
});

test("NFC redirect resolution requires an active device", () => {
  assert.equal(
    isLiveRedirect({
      ...live,
      sourceType: "NFC",
      deviceStatus: "ASSIGNED",
    }),
    false,
  );
  assert.equal(
    isLiveRedirect({
      ...live,
      sourceType: "NFC",
      deviceStatus: "ACTIVE",
    }),
    true,
  );
});