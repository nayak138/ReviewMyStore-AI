import { and, desc, eq, inArray } from "drizzle-orm";
import { db, demoRequestsTable, type DemoRequest } from "@workspace/db";
import { sendDemoRequestAlert } from "./notificationService";
import { appendLeadToGoogleSheet } from "./googleSheetsService";

export class DemoRequestNotFoundError extends Error {
  constructor() {
    super("Demo request not found.");
    this.name = "DemoRequestNotFoundError";
  }
}

export class DemoRequestAlertResendUnavailableError extends Error {
  constructor() {
    super("Only failed or partially delivered alerts can be resent.");
    this.name = "DemoRequestAlertResendUnavailableError";
  }
}

function serializeDemoRequest(row: DemoRequest) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

export async function createDemoRequest(input: {
  name: string;
  leadType: "AGENCY" | "SINGLE_SHOP";
  email?: string;
  company?: string;
  phone?: string;
  locations?: string;
  message?: string;
}) {
  const [row] = await db
    .insert(demoRequestsTable)
    .values({
      name: input.name.trim(),
      leadType: input.leadType,
      email: input.email?.trim() || null,
      company: input.company?.trim() || null,
      phone: input.phone?.trim() || null,
      locations: input.locations?.trim() || null,
      message: input.message?.trim() || null,
      alertDeliveryStatus: "PENDING",
    })
    .returning({ id: demoRequestsTable.id, createdAt: demoRequestsTable.createdAt });

  // Fire-and-forget: alert the owner via email. Errors are caught inside
  // sendDemoRequestAlert so they never propagate back to the HTTP response.
  void sendDemoRequestAlert({
    id: row.id,
    name: input.name.trim(),
    leadType: input.leadType,
    email: input.email?.trim() || null,
    company: input.company?.trim() || null,
    phone: input.phone?.trim() || null,
    locations: input.locations?.trim() || null,
    message: input.message?.trim() || null,
    createdAt: row.createdAt.toISOString(),
  }).then(async (result) => {
    await db
      .update(demoRequestsTable)
      .set({
        alertDeliveryStatus: result.status,
        alertDeliveryError: result.error ?? null,
      })
      .where(eq(demoRequestsTable.id, row.id));
  }).catch((error) => {
    console.error("[demoRequestService] Failed to persist alert delivery status:", error);
  });
  void appendLeadToGoogleSheet({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    name: input.name.trim(),
    leadType: input.leadType,
    company: input.company?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
  });

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
  return serializeDemoRequest(row);
}

export async function resendDemoRequestAlert(id: string) {
  const [lead] = await db
    .select()
    .from(demoRequestsTable)
    .where(eq(demoRequestsTable.id, id))
    .limit(1);
  if (!lead) throw new DemoRequestNotFoundError();

  const [claimed] = await db
    .update(demoRequestsTable)
    .set({ alertDeliveryStatus: "PENDING", alertDeliveryError: null })
    .where(
      and(
        eq(demoRequestsTable.id, id),
        inArray(demoRequestsTable.alertDeliveryStatus, ["FAILED", "PARTIAL"]),
      ),
    )
    .returning({ id: demoRequestsTable.id });
  if (!claimed) throw new DemoRequestAlertResendUnavailableError();

  const result = await sendDemoRequestAlert({
    id: lead.id,
    name: lead.name,
    leadType: lead.leadType as "AGENCY" | "SINGLE_SHOP" | null,
    email: lead.email,
    company: lead.company,
    phone: lead.phone,
    locations: lead.locations,
    message: lead.message,
    createdAt: lead.createdAt.toISOString(),
  });
  const [updated] = await db
    .update(demoRequestsTable)
    .set({
      alertDeliveryStatus: result.status,
      alertDeliveryError: result.error ?? null,
    })
    .where(eq(demoRequestsTable.id, id))
    .returning();
  if (!updated) throw new DemoRequestNotFoundError();
  return serializeDemoRequest(updated);
}

export async function listDemoRequests() {
  const rows = await db
    .select()
    .from(demoRequestsTable)
    .orderBy(desc(demoRequestsTable.createdAt));
  return {
    demoRequests: rows.map(serializeDemoRequest),
  };
}
