import { pgEnum } from "drizzle-orm/pg-core";

/** Safe, provider-agnostic outcome for a background notification attempt. */
export const notificationDeliveryStatusEnum = pgEnum(
  "notification_delivery_status",
  ["PENDING", "SENT", "PARTIAL", "FAILED", "SKIPPED"],
);

export type NotificationDeliveryStatus =
  (typeof notificationDeliveryStatusEnum.enumValues)[number];