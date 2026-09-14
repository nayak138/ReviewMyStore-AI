import { and, desc, eq } from "drizzle-orm";
import {
  db,
  businessesTable,
  campaignsTable,
  privateFeedbackTable,
  type PrivateFeedback,
} from "@workspace/db";
import { findActivePublicCampaign } from "./publicReviewService";

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

  await db.insert(privateFeedbackTable).values({
    organizationId: business.organizationId,
    businessId: business.id,
    campaignId: campaign.id,
    sessionId: input.sessionId,
    rating: input.rating,
    message: input.message,
    contact: input.contact ?? null,
    language: input.language ?? business.defaultLanguage ?? "en",
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
  createdAt: Date;
}

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

export async function listPrivateFeedback(
  organizationId: string,
  filters: ListPrivateFeedbackFilters,
): Promise<PrivateFeedbackListItem[]> {
  const conditions = [eq(privateFeedbackTable.organizationId, organizationId)];
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
