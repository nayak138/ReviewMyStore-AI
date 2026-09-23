const TEAM_INVITATION_TOKEN_STORAGE_KEY =
  "reviewmystore.teamInvitationToken";

type TeamInvitationTokenStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export function storeTeamInvitationToken(
  token: string,
  storage: TeamInvitationTokenStorage,
) {
  const trimmedToken = token.trim();
  if (trimmedToken) {
    storage.setItem(TEAM_INVITATION_TOKEN_STORAGE_KEY, trimmedToken);
  }
  return trimmedToken;
}

export function resolveTeamInvitationToken(
  search: string,
  storage: TeamInvitationTokenStorage,
): string {
  const token = new URLSearchParams(search).get("teamInvite")?.trim() ?? "";
  if (token) {
    return storeTeamInvitationToken(token, storage);
  }
  return storage.getItem(TEAM_INVITATION_TOKEN_STORAGE_KEY)?.trim() ?? "";
}

export function clearTeamInvitationToken(storage: TeamInvitationTokenStorage) {
  storage.removeItem(TEAM_INVITATION_TOKEN_STORAGE_KEY);
}