import {
  getGetCurrentUserQueryKey,
  useGetCurrentUser,
  type TeamBusinessAccess,
} from "@workspace/api-client-react";

export type TeamFeature =
  | "campaignsPermission"
  | "reviewInboxPermission"
  | "feedbackPermission"
  | "socialMediaPermission"
  | "analyticsPermission";

export function useTeamAccess() {
  const query = useGetCurrentUser({
    query: {
      queryKey: getGetCurrentUserQueryKey(),
    },
  });
  const session = query.data;
  const isOwner = session?.user.role === "OWNER";
  const isTeamMember = session?.user.role === "TEAM_MEMBER";
  const teamAccess = session?.teamAccess ?? [];

  const accessFor = (businessId: string): TeamBusinessAccess | undefined =>
    teamAccess.find((access) => access.businessId === businessId);

  const canView = (businessId: string, feature: TeamFeature) =>
    isOwner || accessFor(businessId)?.[feature] !== "NONE";

  const canManage = (businessId: string, feature: TeamFeature) =>
    isOwner || accessFor(businessId)?.[feature] === "MANAGE";

  return {
    ...query,
    session,
    teamAccess,
    isOwner,
    isTeamMember,
    accessFor,
    canView,
    canManage,
  };
}