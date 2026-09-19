const INVITATION_TOKEN_STORAGE_KEY = "reviewmystore.agencyInvitationToken";

type InvitationTokenStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function resolveInvitationToken(
  search: string,
  storage: InvitationTokenStorage,
): string {
  const token = new URLSearchParams(search).get("invite")?.trim() ?? "";
  if (token) {
    storage.setItem(INVITATION_TOKEN_STORAGE_KEY, token);
    return token;
  }

  return storage.getItem(INVITATION_TOKEN_STORAGE_KEY)?.trim() ?? "";
}

export function clearInvitationToken(storage: InvitationTokenStorage): void {
  storage.removeItem(INVITATION_TOKEN_STORAGE_KEY);
}