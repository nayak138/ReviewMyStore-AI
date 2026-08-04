import { and, asc, eq, isNull } from "drizzle-orm";
import {
  db,
  businessesTable,
  campaignsTable,
  keywordsTable,
  type Keyword,
} from "@workspace/db";
import { CampaignNotFoundError } from "./campaignService";

export class KeywordNotFoundError extends Error {
  constructor(id: string) {
    super(`Keyword ${id} not found`);
    this.name = "KeywordNotFoundError";
  }
}

/** Verifies the campaign belongs to organizationId (via its business) before
 * any keyword read/write touches it. */
async function assertOrgOwnsCampaign(
  organizationId: string,
  campaignId: string,
): Promise<void> {
  const [row] = await db
    .select({ id: campaignsTable.id })
    .from(campaignsTable)
    .innerJoin(
      businessesTable,
      eq(campaignsTable.businessId, businessesTable.id),
    )
    .where(
      and(
        eq(campaignsTable.id, campaignId),
        eq(businessesTable.organizationId, organizationId),
        isNull(campaignsTable.deletedAt),
      ),
    )
    .limit(1);
  if (!row) throw new CampaignNotFoundError(campaignId);
}

/** Loads a keyword scoped by organizationId via a join through its campaign
 * and business, so a caller can never read/mutate another org's keyword. */
async function findOrgKeyword(
  organizationId: string,
  id: string,
): Promise<Keyword> {
  const [row] = await db
    .select({ keyword: keywordsTable })
    .from(keywordsTable)
    .innerJoin(
      campaignsTable,
      eq(keywordsTable.campaignId, campaignsTable.id),
    )
    .innerJoin(
      businessesTable,
      eq(campaignsTable.businessId, businessesTable.id),
    )
    .where(
      and(
        eq(keywordsTable.id, id),
        eq(businessesTable.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!row) throw new KeywordNotFoundError(id);
  return row.keyword;
}

export async function listKeywords(
  organizationId: string,
  campaignId: string,
): Promise<Keyword[]> {
  await assertOrgOwnsCampaign(organizationId, campaignId);
  return db
    .select()
    .from(keywordsTable)
    .where(eq(keywordsTable.campaignId, campaignId))
    .orderBy(asc(keywordsTable.sortOrder), asc(keywordsTable.createdAt));
}

export interface CreateKeywordInput {
  label: string;
  category: Keyword["category"];
  enabled?: boolean;
  sortOrder?: number;
}

export async function createKeyword(
  organizationId: string,
  campaignId: string,
  input: CreateKeywordInput,
): Promise<Keyword> {
  await assertOrgOwnsCampaign(organizationId, campaignId);
  const [keyword] = await db
    .insert(keywordsTable)
    .values({ campaignId, ...input })
    .returning();
  return keyword;
}

export type UpdateKeywordInput = Partial<CreateKeywordInput>;

export async function updateKeyword(
  organizationId: string,
  id: string,
  input: UpdateKeywordInput,
): Promise<Keyword> {
  await findOrgKeyword(organizationId, id);
  const [updated] = await db
    .update(keywordsTable)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(keywordsTable.id, id))
    .returning();
  return updated;
}

export async function deleteKeyword(
  organizationId: string,
  id: string,
): Promise<void> {
  await findOrgKeyword(organizationId, id);
  await db.delete(keywordsTable).where(eq(keywordsTable.id, id));
}
