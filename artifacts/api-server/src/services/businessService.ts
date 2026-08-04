import { and, desc, eq, isNull } from "drizzle-orm";
import { db, businessesTable, type Business } from "@workspace/db";

export class BusinessNotFoundError extends Error {
  constructor(id: string) {
    super(`Business ${id} not found`);
    this.name = "BusinessNotFoundError";
  }
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "business"
  );
}

/**
 * Slugs are globally unique (not just per-organization) since they will back
 * a future public review-page URL (e.g. reviewmystore.ai/b/<slug>).
 */
export async function generateUniqueBusinessSlug(base: string): Promise<string> {
  const baseSlug = slugify(base);
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const [existing] = await db
      .select({ id: businessesTable.id })
      .from(businessesTable)
      .where(eq(businessesTable.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

/** Always scopes by organizationId and excludes soft-deleted rows — the only
 * path any route/service should use to read or mutate a Business, so a
 * caller from one Organization can never see or touch another's rows. */
async function findOrgBusiness(
  organizationId: string,
  id: string,
): Promise<Business> {
  const [business] = await db
    .select()
    .from(businessesTable)
    .where(
      and(
        eq(businessesTable.id, id),
        eq(businessesTable.organizationId, organizationId),
        isNull(businessesTable.deletedAt),
      ),
    )
    .limit(1);
  if (!business) throw new BusinessNotFoundError(id);
  return business;
}

export async function listBusinesses(
  organizationId: string,
  includeArchived: boolean,
): Promise<Business[]> {
  const conditions = [
    eq(businessesTable.organizationId, organizationId),
    isNull(businessesTable.deletedAt),
  ];
  if (!includeArchived) conditions.push(isNull(businessesTable.archivedAt));

  return db
    .select()
    .from(businessesTable)
    .where(and(...conditions))
    .orderBy(desc(businessesTable.createdAt));
}

export async function getBusiness(
  organizationId: string,
  id: string,
): Promise<Business> {
  return findOrgBusiness(organizationId, id);
}

export interface CreateBusinessInput {
  name: string;
  category: string;
  googlePlaceId?: string | null;
  slug: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  brandColor?: string | null;
  welcomeMessage?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  placeImageUrl?: string | null;
}

export async function createBusiness(
  organizationId: string,
  input: CreateBusinessInput,
): Promise<Business> {
  const [business] = await db
    .insert(businessesTable)
    .values({ organizationId, ...input })
    .returning();
  return business;
}

export type UpdateBusinessInput = Partial<CreateBusinessInput>;

export async function updateBusiness(
  organizationId: string,
  id: string,
  input: UpdateBusinessInput,
): Promise<Business> {
  await findOrgBusiness(organizationId, id);
  const [updated] = await db
    .update(businessesTable)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(businessesTable.id, id))
    .returning();
  return updated;
}

export async function softDeleteBusiness(
  organizationId: string,
  id: string,
): Promise<void> {
  await findOrgBusiness(organizationId, id);
  await db
    .update(businessesTable)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(businessesTable.id, id));
}

export async function archiveBusiness(
  organizationId: string,
  id: string,
): Promise<Business> {
  await findOrgBusiness(organizationId, id);
  const [updated] = await db
    .update(businessesTable)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(businessesTable.id, id))
    .returning();
  return updated;
}

export async function restoreBusiness(
  organizationId: string,
  id: string,
): Promise<Business> {
  await findOrgBusiness(organizationId, id);
  const [updated] = await db
    .update(businessesTable)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(eq(businessesTable.id, id))
    .returning();
  return updated;
}

export async function setBusinessStatus(
  organizationId: string,
  id: string,
  status: Business["status"],
): Promise<Business> {
  await findOrgBusiness(organizationId, id);
  const [updated] = await db
    .update(businessesTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(businessesTable.id, id))
    .returning();
  return updated;
}
