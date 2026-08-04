import { and, desc, eq, isNull } from "drizzle-orm";
import {
  db,
  businessesTable,
  campaignsTable,
  type Campaign,
} from "@workspace/db";
import { BusinessNotFoundError } from "./businessService";

export class CampaignNotFoundError extends Error {
  constructor(id: string) {
    super(`Campaign ${id} not found`);
    this.name = "CampaignNotFoundError";
  }
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "campaign"
  );
}

/** Verifies the business belongs to organizationId before any campaign
 * read/write touches it, so a caller from one org can never reach another
 * org's campaigns through a guessed businessId. */
async function assertOrgOwnsBusiness(
  organizationId: string,
  businessId: string,
): Promise<void> {
  const [business] = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(
      and(
        eq(businessesTable.id, businessId),
        eq(businessesTable.organizationId, organizationId),
        isNull(businessesTable.deletedAt),
      ),
    )
    .limit(1);
  if (!business) throw new BusinessNotFoundError(businessId);
}

/** Loads a campaign scoped by organizationId via a join on its business, so
 * a caller can never read/mutate another org's campaign by id. */
async function findOrgCampaign(
  organizationId: string,
  id: string,
): Promise<Campaign> {
  const [row] = await db
    .select({ campaign: campaignsTable })
    .from(campaignsTable)
    .innerJoin(
      businessesTable,
      eq(campaignsTable.businessId, businessesTable.id),
    )
    .where(
      and(
        eq(campaignsTable.id, id),
        eq(businessesTable.organizationId, organizationId),
        isNull(campaignsTable.deletedAt),
      ),
    )
    .limit(1);
  if (!row) throw new CampaignNotFoundError(id);
  return row.campaign;
}

async function generateUniqueCampaignSlug(
  businessId: string,
  base: string,
): Promise<string> {
  const baseSlug = slugify(base);
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const [existing] = await db
      .select({ id: campaignsTable.id })
      .from(campaignsTable)
      .where(
        and(
          eq(campaignsTable.businessId, businessId),
          eq(campaignsTable.slug, candidate),
        ),
      )
      .limit(1);
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

export async function listCampaigns(
  organizationId: string,
  businessId: string,
  includeArchived: boolean,
): Promise<Campaign[]> {
  await assertOrgOwnsBusiness(organizationId, businessId);

  const conditions = [
    eq(campaignsTable.businessId, businessId),
    isNull(campaignsTable.deletedAt),
  ];
  if (!includeArchived) conditions.push(isNull(campaignsTable.archivedAt));

  return db
    .select()
    .from(campaignsTable)
    .where(and(...conditions))
    .orderBy(desc(campaignsTable.createdAt));
}

export async function getCampaign(
  organizationId: string,
  id: string,
): Promise<Campaign> {
  return findOrgCampaign(organizationId, id);
}

export interface CreateCampaignInput {
  name: string;
  description?: string | null;
  type?: string;
  status?: Campaign["status"];
}

export async function createCampaign(
  organizationId: string,
  businessId: string,
  input: CreateCampaignInput,
): Promise<Campaign> {
  await assertOrgOwnsBusiness(organizationId, businessId);
  const slug = await generateUniqueCampaignSlug(businessId, input.name);

  const [campaign] = await db
    .insert(campaignsTable)
    .values({ businessId, slug, ...input })
    .returning();
  return campaign;
}

export type UpdateCampaignInput = Partial<
  Pick<CreateCampaignInput, "name" | "description" | "type">
>;

export async function updateCampaign(
  organizationId: string,
  id: string,
  input: UpdateCampaignInput,
): Promise<Campaign> {
  await findOrgCampaign(organizationId, id);
  const [updated] = await db
    .update(campaignsTable)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(campaignsTable.id, id))
    .returning();
  return updated;
}

export async function softDeleteCampaign(
  organizationId: string,
  id: string,
): Promise<void> {
  await findOrgCampaign(organizationId, id);
  await db
    .update(campaignsTable)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(campaignsTable.id, id));
}

export async function archiveCampaign(
  organizationId: string,
  id: string,
): Promise<Campaign> {
  await findOrgCampaign(organizationId, id);
  const [updated] = await db
    .update(campaignsTable)
    .set({ archivedAt: new Date(), status: "ARCHIVED", updatedAt: new Date() })
    .where(eq(campaignsTable.id, id))
    .returning();
  return updated;
}

export async function restoreCampaign(
  organizationId: string,
  id: string,
): Promise<Campaign> {
  await findOrgCampaign(organizationId, id);
  const [updated] = await db
    .update(campaignsTable)
    .set({ archivedAt: null, status: "DRAFT", updatedAt: new Date() })
    .where(eq(campaignsTable.id, id))
    .returning();
  return updated;
}

export async function setCampaignStatus(
  organizationId: string,
  id: string,
  status: Campaign["status"],
): Promise<Campaign> {
  await findOrgCampaign(organizationId, id);
  const [updated] = await db
    .update(campaignsTable)
    .set({
      status,
      archivedAt: status === "ARCHIVED" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(campaignsTable.id, id))
    .returning();
  return updated;
}
