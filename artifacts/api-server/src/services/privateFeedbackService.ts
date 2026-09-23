import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  db,
  businessesTable,
  campaignsTable,
  businessMembershipsTable,
  privateFeedbackTable,
  usersTable,
  type PrivateFeedback,
  type User,
} from "@workspace/db";
import { findActivePublicCampaign } from "./publicReviewService";
import { sendPrivateFeedbackAlert } from "./notificationService";

export class InvalidFeedbackRatingError extends Error {
  constructor() {
    super("Private feedback is only accepted for ratings below 3 stars");
    this.name = "InvalidFeedbackRatingError";
  }
}

export class FeedbackNotFoundError extends Error {
  constructor(id: string) {
    super(`Feedback ${id} not found`);
    this.name = "FeedbackNotFoundError";
  }
}

export interface SubmitPrivateFeedbackInput {
  sessionId: string;
  rating: number;
  message: string;
  contact?: string | null;
  language?: string;
}

export interface FeedbackQuality {
  isSpam: boolean;
  reason: string | null;
}

/** Conservative quality checks flag obvious automated/promotional submissions
 * for owner review without blocking a genuine unhappy customer. */
export function assessFeedbackQuality(
  message: string,
  contact?: string | null,
): FeedbackQuality {
  const normalized = message.trim();
  const urlCount = (normalized.match(/https?:\/\/|www\./gi) ?? []).length;
  if (urlCount > 0) {
    return { isSpam: true, reason: "Contains a promotional link" };
  }
  if (/(.)\1{7,}/u.test(normalized)) {
    return { isSpam: true, reason: "Contains repeated characters" };
  }
  const letters = normalized.match(/[A-Za-z]/g) ?? [];
  const uppercase = normalized.match(/[A-Z]/g) ?? [];
  if (letters.length >= 12 && uppercase.length / letters.length > 0.8) {
    return { isSpam: true, reason: "Unusual capitalization pattern" };
  }
  if (contact && /(https?:\/\/|www\.)/i.test(contact)) {
    return { isSpam: true, reason: "Contact field contains a link" };
  }
  return { isSpam: false, reason: null };
}

/** Only accepts ratings below 3 — this is the private "we strive for 5-star
 * service" escape hatch shown to an unhappy customer, not a general feedback
 * box, so we reject anything else server-side even though the frontend
 * would never send it. */
export async function submitPrivateFeedback(
  businessSlug: string,
  campaignSlug: string,
  input: SubmitPrivateFeedbackInput,
): Promise<void> {
  if (input.rating >= 3) throw new InvalidFeedbackRatingError();

  const { business, campaign } = await findActivePublicCampaign(
    businessSlug,
    campaignSlug,
  );
  const quality = assessFeedbackQuality(input.message, input.contact);

  const [feedback] = await db.insert(privateFeedbackTable).values({
    organizationId: business.organizationId,
    businessId: business.id,
    campaignId: campaign.id,
    sessionId: input.sessionId,
    rating: input.rating,
    message: input.message,
    contact: input.contact ?? null,
    language: input.language ?? business.defaultLanguage ?? "en",
    spamFlag: quality.isSpam,
    spamReason: quality.reason,
  }).returning({
    id: privateFeedbackTable.id,
    createdAt: privateFeedbackTable.createdAt,
  });

  const owners = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.organizationId, business.organizationId),
        eq(usersTable.role, "OWNER"),
        eq(usersTable.status, "ACTIVE"),
      ),
    );
  const recipients = owners
    .map((owner) => owner.email?.trim())
    .filter((email): email is string => Boolean(email));
  void sendPrivateFeedbackAlert({
    recipients,
    businessName: business.name,
    rating: input.rating,
    message: input.message,
    contact: input.contact ?? null,
    createdAt: feedback.createdAt.toISOString(),
    isSpam: quality.isSpam,
  });
}

export interface ListPrivateFeedbackFilters {
  businessId?: string;
  campaignId?: string;
  status?: PrivateFeedback["status"];
  limit?: number;
}

export interface PrivateFeedbackListItem {
  id: string;
  businessId: string;
  businessName: string;
  campaignId: string;
  campaignName: string;
  rating: number;
  message: string;
  contact: string | null;
  language: string;
  status: PrivateFeedback["status"];
  spamFlag: boolean;
  spamReason: string | null;
  createdAt: Date;
}

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

export async function listPrivateFeedback(
  organizationId: string,
  filters: ListPrivateFeedbackFilters,
  businessIds?: string[],
): Promise<PrivateFeedbackListItem[]> {
  const conditions = [eq(privateFeedbackTable.organizationId, organizationId)];
  if (businessIds) {
    conditions.push(inArray(privateFeedbackTable.businessId, businessIds));
  }
  if (filters.businessId) {
    conditions.push(eq(privateFeedbackTable.businessId, filters.businessId));
  }
  if (filters.campaignId) {
    conditions.push(eq(privateFeedbackTable.campaignId, filters.campaignId));
  }
  if (filters.status) {
    conditions.push(eq(privateFeedbackTable.status, filters.status));
  }
  const limit = Math.min(
    Math.max(1, filters.limit ?? DEFAULT_LIST_LIMIT),
    MAX_LIST_LIMIT,
  );

  const rows = await db
    .select({
      id: privateFeedbackTable.id,
      businessId: privateFeedbackTable.businessId,
      businessName: businessesTable.name,
      campaignId: privateFeedbackTable.campaignId,
      campaignName: campaignsTable.name,
      rating: privateFeedbackTable.rating,
      message: privateFeedbackTable.message,
      contact: privateFeedbackTable.contact,
      language: privateFeedbackTable.language,
      status: privateFeedbackTable.status,
      spamFlag: privateFeedbackTable.spamFlag,
      spamReason: privateFeedbackTable.spamReason,
      createdAt: privateFeedbackTable.createdAt,
    })
    .from(privateFeedbackTable)
    .innerJoin(businessesTable, eq(privateFeedbackTable.businessId, businessesTable.id))
    .innerJoin(campaignsTable, eq(privateFeedbackTable.campaignId, campaignsTable.id))
    .where(and(...conditions))
    .orderBy(desc(privateFeedbackTable.createdAt))
    .limit(limit);

  return rows;
}

export async function listPrivateFeedbackForUser(
  user: User,
  filters: ListPrivateFeedbackFilters,
) {
  if (user.role === "OWNER" && user.organizationId) {
    return listPrivateFeedback(user.organizationId, filters);
  }
  if (user.role !== "TEAM_MEMBER" || !user.organizationId) return [];
  const memberships = await db
    .select({ businessId: businessMembershipsTable.businessId })
    .from(businessMembershipsTable)
    .where(
      and(
        eq(businessMembershipsTable.userId, user.id),
        eq(businessMembershipsTable.organizationId, user.organizationId),
        isNull(businessMembershipsTable.removedAt),
      ),
    );
  return listPrivateFeedback(
    user.organizationId,
    filters,
    memberships.map((membership) => membership.businessId),
  );
}

export async function updatePrivateFeedbackStatus(
  organizationId: string,
  id: string,
  status: PrivateFeedback["status"],
): Promise<PrivateFeedbackListItem> {
  const [updated] = await db
    .update(privateFeedbackTable)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(privateFeedbackTable.id, id),
        eq(privateFeedbackTable.organizationId, organizationId),
      ),
    )
    .returning({ id: privateFeedbackTable.id });
  if (!updated) throw new FeedbackNotFoundError(id);

  const [item] = await db
    .select({
      id: privateFeedbackTable.id,
      businessId: privateFeedbackTable.businessId,
      businessName: businessesTable.name,
      campaignId: privateFeedbackTable.campaignId,
      campaignName: campaignsTable.name,
      rating: privateFeedbackTable.rating,
      message: privateFeedbackTable.message,
      contact: privateFeedbackTable.contact,
      language: privateFeedbackTable.language,
      status: privateFeedbackTable.status,
      spamFlag: privateFeedbackTable.spamFlag,
      spamReason: privateFeedbackTable.spamReason,
      createdAt: privateFeedbackTable.createdAt,
    })
    .from(privateFeedbackTable)
    .innerJoin(businessesTable, eq(privateFeedbackTable.businessId, businessesTable.id))
    .innerJoin(campaignsTable, eq(privateFeedbackTable.campaignId, campaignsTable.id))
    .where(eq(privateFeedbackTable.id, id))
    .limit(1);
  if (!item) throw new FeedbackNotFoundError(id);
  return item;
}
