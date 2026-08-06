import { desc, eq } from "drizzle-orm";
import { db, demoRequestsTable } from "@workspace/db";

export async function createDemoRequest(input: {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  locations?: string;
  message?: string;
}) {
  const [row] = await db
    .insert(demoRequestsTable)
    .values({
      name: input.name.trim(),
      email: input.email.trim(),
      company: input.company?.trim() || null,
      phone: input.phone?.trim() || null,
      locations: input.locations?.trim() || null,
      message: input.message?.trim() || null,
    })
    .returning({ id: demoRequestsTable.id });
  return { id: row.id };
}

export async function updateDemoRequest(
  id: string,
  updates: {
    status?: "NEW" | "CONTACTED" | "CLOSED";
    notes?: string;
  },
) {
  const set: {
    status?: "NEW" | "CONTACTED" | "CLOSED";
    notes?: string | null;
  } = {};
  if (updates.status !== undefined) set.status = updates.status;
  if (updates.notes !== undefined) set.notes = updates.notes.trim() || null;
  const [row] = await db
    .update(demoRequestsTable)
    .set(set)
    .where(eq(demoRequestsTable.id, id))
    .returning();
  if (!row) return null;
  return { ...row, createdAt: row.createdAt.toISOString() };
}

export async function listDemoRequests() {
  const rows = await db
    .select()
    .from(demoRequestsTable)
    .orderBy(desc(demoRequestsTable.createdAt));
  return {
    demoRequests: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
