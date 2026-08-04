import { and, desc, eq, isNull, ne } from "drizzle-orm";
import {
  db,
  businessesTable,
  campaignsTable,
  nfcDevicesTable,
  redirectLinksTable,
  type NfcDevice,
} from "@workspace/db";
import { CampaignNotFoundError } from "./campaignService";
import {
  ensureNfcDeviceLink,
  redirectPathForCode,
  setNfcDeviceLinkActive,
} from "./redirectService";

export class NfcDeviceNotFoundError extends Error {
  constructor(id: string) {
    super(`NFC device ${id} not found`);
    this.name = "NfcDeviceNotFoundError";
  }
}

export class NfcUidConflictError extends Error {
  constructor(uid: string) {
    super(`An NFC device with UID "${uid}" is already registered`);
    this.name = "NfcUidConflictError";
  }
}

export class NfcInvalidStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NfcInvalidStateError";
  }
}

export interface NfcDeviceDto {
  id: string;
  uid: string;
  name: string;
  businessId: string | null;
  businessName: string | null;
  campaignId: string | null;
  campaignName: string | null;
  status: NfcDevice["status"];
  redirectPath: string | null;
  assignedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

async function toDto(device: NfcDevice): Promise<NfcDeviceDto> {
  const [business] = device.businessId
    ? await db
        .select({ name: businessesTable.name })
        .from(businessesTable)
        .where(eq(businessesTable.id, device.businessId))
        .limit(1)
    : [];
  const [campaign] = device.campaignId
    ? await db
        .select({ name: campaignsTable.name })
        .from(campaignsTable)
        .where(eq(campaignsTable.id, device.campaignId))
        .limit(1)
    : [];
  const [link] = await db
    .select({ code: redirectLinksTable.code })
    .from(redirectLinksTable)
    .where(eq(redirectLinksTable.nfcDeviceId, device.id))
    .limit(1);

  return {
    id: device.id,
    uid: device.uid,
    name: device.name,
    businessId: device.businessId,
    businessName: business?.name ?? null,
    campaignId: device.campaignId,
    campaignName: campaign?.name ?? null,
    status: device.status,
    redirectPath: link ? redirectPathForCode(link.code) : null,
    assignedAt: device.assignedAt,
    notes: device.notes,
    createdAt: device.createdAt,
    updatedAt: device.updatedAt,
  };
}

async function findOrgDevice(
  organizationId: string,
  id: string,
): Promise<NfcDevice> {
  const [device] = await db
    .select()
    .from(nfcDevicesTable)
    .where(
      and(
        eq(nfcDevicesTable.id, id),
        eq(nfcDevicesTable.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!device) throw new NfcDeviceNotFoundError(id);
  return device;
}

async function assertUidAvailable(
  organizationId: string,
  uid: string,
  excludeId?: string,
): Promise<void> {
  const conditions = [
    eq(nfcDevicesTable.organizationId, organizationId),
    eq(nfcDevicesTable.uid, uid),
  ];
  if (excludeId) conditions.push(ne(nfcDevicesTable.id, excludeId));
  const [existing] = await db
    .select({ id: nfcDevicesTable.id })
    .from(nfcDevicesTable)
    .where(and(...conditions))
    .limit(1);
  if (existing) throw new NfcUidConflictError(uid);
}

export async function listNfcDevices(
  organizationId: string,
  filters: { businessId?: string; campaignId?: string },
): Promise<NfcDeviceDto[]> {
  const conditions = [eq(nfcDevicesTable.organizationId, organizationId)];
  if (filters.businessId)
    conditions.push(eq(nfcDevicesTable.businessId, filters.businessId));
  if (filters.campaignId)
    conditions.push(eq(nfcDevicesTable.campaignId, filters.campaignId));

  const devices = await db
    .select()
    .from(nfcDevicesTable)
    .where(and(...conditions))
    .orderBy(desc(nfcDevicesTable.createdAt));

  return Promise.all(devices.map(toDto));
}

export async function registerNfcDevice(
  organizationId: string,
  input: { uid: string; name: string; notes?: string | null },
): Promise<NfcDeviceDto> {
  await assertUidAvailable(organizationId, input.uid);
  const [device] = await db
    .insert(nfcDevicesTable)
    .values({
      organizationId,
      uid: input.uid,
      name: input.name,
      notes: input.notes ?? null,
    })
    .returning();
  return toDto(device);
}

export async function updateNfcDevice(
  organizationId: string,
  id: string,
  input: { uid?: string; name?: string; notes?: string | null },
): Promise<NfcDeviceDto> {
  const device = await findOrgDevice(organizationId, id);
  if (input.uid && input.uid !== device.uid) {
    await assertUidAvailable(organizationId, input.uid, id);
  }
  const [updated] = await db
    .update(nfcDevicesTable)
    .set({
      ...(input.uid !== undefined ? { uid: input.uid } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      updatedAt: new Date(),
    })
    .where(eq(nfcDevicesTable.id, device.id))
    .returning();
  return toDto(updated);
}

export async function deleteNfcDevice(
  organizationId: string,
  id: string,
): Promise<void> {
  const device = await findOrgDevice(organizationId, id);
  // redirect_links.nfc_device_id cascades, so the short code dies with the
  // device; scan_events keep their denormalized names via SET NULL.
  await db.delete(nfcDevicesTable).where(eq(nfcDevicesTable.id, device.id));
}

/** Assign or reassign. The device keeps its one redirect link forever — we
 * just point it at the new campaign, so the physical tag never needs
 * re-writing. */
export async function assignNfcDevice(
  organizationId: string,
  id: string,
  campaignId: string,
): Promise<NfcDeviceDto> {
  const device = await findOrgDevice(organizationId, id);

  const [row] = await db
    .select({ campaign: campaignsTable, business: businessesTable })
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

  // Link retargeting and device state must move together — a scan between the
  // two would otherwise be logged against a half-updated assignment.
  const updated = await db.transaction(async (tx) => {
    await ensureNfcDeviceLink(device.id, row.campaign.id, tx);
    const [result] = await tx
      .update(nfcDevicesTable)
      .set({
        campaignId: row.campaign.id,
        businessId: row.business.id,
        status: device.status === "DISABLED" ? "DISABLED" : "ASSIGNED",
        assignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(nfcDevicesTable.id, device.id))
      .returning();
    return result;
  });
  return toDto(updated);
}

export async function unassignNfcDevice(
  organizationId: string,
  id: string,
): Promise<NfcDeviceDto> {
  const device = await findOrgDevice(organizationId, id);

  const updated = await db.transaction(async (tx) => {
    await setNfcDeviceLinkActive(device.id, false, tx);
    const [result] = await tx
      .update(nfcDevicesTable)
      .set({
        campaignId: null,
        businessId: null,
        status: device.status === "DISABLED" ? "DISABLED" : "AVAILABLE",
        assignedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(nfcDevicesTable.id, device.id))
      .returning();
    return result;
  });
  return toDto(updated);
}

export async function setNfcDeviceStatus(
  organizationId: string,
  id: string,
  status: "ACTIVE" | "DISABLED",
): Promise<NfcDeviceDto> {
  const device = await findOrgDevice(organizationId, id);

  if (status === "ACTIVE" && !device.campaignId) {
    throw new NfcInvalidStateError(
      "Assign this device to a campaign before activating it.",
    );
  }

  const updated = await db.transaction(async (tx) => {
    if (status === "ACTIVE") {
      await setNfcDeviceLinkActive(device.id, true, tx);
    }
    const [result] = await tx
      .update(nfcDevicesTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(nfcDevicesTable.id, device.id))
      .returning();
    return result;
  });
  return toDto(updated);
}
