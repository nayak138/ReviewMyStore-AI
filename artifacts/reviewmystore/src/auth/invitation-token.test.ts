import { describe, expect, it } from "vitest";
import {
  clearInvitationToken,
  resolveInvitationToken,
} from "./invitation-token";
import {
  clearTeamInvitationToken,
  resolveTeamInvitationToken,
  storeTeamInvitationToken,
} from "./team-invitation-token";

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

describe("team invitation token persistence", () => {
  it("keeps a direct join-link token through Clerk's queryless return", () => {
    const storage = createStorage();

    expect(storeTeamInvitationToken("secure-team-token", storage)).toBe(
      "secure-team-token",
    );
    expect(resolveTeamInvitationToken("", storage)).toBe("secure-team-token");
  });

  it("prefers a newly supplied team token and clears it after acceptance", () => {
    const storage = createStorage();

    resolveTeamInvitationToken("?teamInvite=old-team-token", storage);
    expect(resolveTeamInvitationToken("?teamInvite=new-team-token", storage)).toBe(
      "new-team-token",
    );

    clearTeamInvitationToken(storage);
    expect(resolveTeamInvitationToken("", storage)).toBe("");
  });
});