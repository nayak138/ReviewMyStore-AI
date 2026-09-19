import { describe, expect, it } from "vitest";
import {
  clearInvitationToken,
  resolveInvitationToken,
} from "./invitation-token";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("invitation token persistence", () => {
  it("keeps the invitation token when Clerk moves to a queryless verification route", () => {
    const storage = createStorage();

    expect(resolveInvitationToken("?invite=secure-token", storage)).toBe(
      "secure-token",
    );
    expect(resolveInvitationToken("", storage)).toBe("secure-token");
  });

  it("replaces an older token and clears it after authentication completes", () => {
    const storage = createStorage();

    resolveInvitationToken("?invite=old-token", storage);
    expect(resolveInvitationToken("?invite=new-token", storage)).toBe(
      "new-token",
    );

    clearInvitationToken(storage);
    expect(resolveInvitationToken("", storage)).toBe("");
  });
});