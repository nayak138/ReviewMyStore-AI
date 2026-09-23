import { clerkClient } from "@clerk/express";

const CLERK_FROM_EMAIL = "notifications@5-star.ai";

/** Escape a string for safe use inside HTML content and attributes. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape a string for safe use as an email subject (no HTML, strip newlines). */
function escSubject(value: string): string {
  return value.replace(/[\r\n]/g, " ").trim();
}

export type InvitationDeliveryResult = {
  sent: boolean;
  error?: string;
};

export type AlertDeliveryStatus = "SENT" | "PARTIAL" | "FAILED" | "SKIPPED";

export type AlertDeliveryResult = {
  status: AlertDeliveryStatus;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  error?: string;
};

function summarizeAlertDelivery(
  recipientCount: number,
  failedCount: number,
): AlertDeliveryResult {
  const deliveredCount = recipientCount - failedCount;
  if (recipientCount === 0) {
    return {
      status: "SKIPPED",
      recipientCount,
      deliveredCount,
      failedCount,
      error: "No alert recipients are configured.",
    };
  }
  if (failedCount === 0) {
    return { status: "SENT", recipientCount, deliveredCount, failedCount };
  }
  const error =
    deliveredCount === 0
      ? `All ${recipientCount} alert recipient${recipientCount === 1 ? "" : "s"} could not be submitted through Clerk.`
      : `${failedCount} of ${recipientCount} alert recipients could not be submitted through Clerk.`;
  return {
    status: deliveredCount > 0 ? "PARTIAL" : "FAILED",
    recipientCount,
    deliveredCount,
    failedCount,
    error,
  };
}

export type TeamInvitationEmailData = {
  to: string;
  agencyName: string;
  businessName: string;
  inviterName: string;
  invitedEmail: string;
  expiresAt: string;
  joinUrl: string;
  grants: Record<string, string>;
};

function remainingInvitationDays(expiresAt: string): number {
  const remainingMilliseconds = new Date(expiresAt).getTime() - Date.now();
  const remainingDays = Math.ceil(remainingMilliseconds / (24 * 60 * 60 * 1000));
  return Math.min(Math.max(remainingDays, 1), 90);
}

async function sendInvitationEmail(input: {
  to: string;
  expiresAt: string;
  joinUrl: string;
}): Promise<InvitationDeliveryResult> {
  try {
    await clerkClient.invitations.createInvitation({
      emailAddress: input.to,
      expiresInDays: remainingInvitationDays(input.expiresAt),
      ignoreExisting: true,
      notify: true,
      redirectUrl: input.joinUrl,
    });
    return { sent: true };
  } catch (error) {
    console.error("[notificationService] Clerk invitation email submission failed:", error);
    return { sent: false, error: "Invitation email could not be submitted through Clerk." };
  }
}

export async function sendTeamInvitationEmail(
  data: TeamInvitationEmailData,
): Promise<InvitationDeliveryResult> {
  return sendInvitationEmail({
    to: data.to,
    expiresAt: data.expiresAt,
    joinUrl: data.joinUrl,
  });
}

export async function sendAgencyOwnerInvitationEmail(data: {
  to: string;
  agencyName: string;
  expiresAt: string;
  joinUrl: string;
}): Promise<InvitationDeliveryResult> {
  return sendInvitationEmail({
    to: data.to,
    expiresAt: data.expiresAt,
    joinUrl: data.joinUrl,
  });
}

/** Send a new-demo-request alert email to all configured recipients.
 *  Failures are caught and logged so they never break the calling request. */
export async function sendDemoRequestAlert(data: {
  id: string;
  name: string;
  leadType?: "AGENCY" | "SINGLE_SHOP" | null;
  email?: string | null;
  company?: string | null;
  phone?: string | null;
  locations?: string | null;
  message?: string | null;
  createdAt?: string;
}): Promise<AlertDeliveryResult> {
  // DEMO_ALERT_EMAILS is a dedicated notification-only variable.
  // It is intentionally separate from SUPER_ADMIN_EMAILS (which controls
  // privileged platform access) so that alert recipients don't accidentally
  // gain super-admin rights.
  const recipientEnv = process.env.DEMO_ALERT_EMAILS ?? "";
  const recipients = recipientEnv
    .split(",")
    .map((e) => e.trim())
    .filter((e): e is string => e.length > 0);

  if (recipients.length === 0) {
    console.warn(
      "[notificationService] DEMO_ALERT_EMAILS is not configured — skipping demo-request alert email.",
    );
    return summarizeAlertDelivery(0, 0);
  }

  try {
    // Only include rows that have a non-empty value
    const optionalRows: Array<[string, string]> = [];
    if (data.leadType) optionalRows.push(["Lead type", data.leadType === "AGENCY" ? "Agency" : "Single Shop"]);
    if (data.company) optionalRows.push(["Company", data.company]);
    if (data.phone) optionalRows.push(["Phone", data.phone]);
    if (data.locations) optionalRows.push(["Locations", data.locations]);
    if (data.message) optionalRows.push(["Message", data.message]);

    const requiredRows: Array<[string, string]> = [["Name", data.name]];
    if (data.email) requiredRows.push(["Email", data.email]);

    const allRows = [...requiredRows, ...optionalRows];

    const rowsHtml = allRows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:6px 12px;font-weight:600;color:#555;white-space:nowrap;">${esc(label)}</td><td style="padding:6px 12px;color:#222;">${esc(value)}</td></tr>`,
      )
      .join("\n");

    const subject = escSubject(
      `New 5-Star.AI ${data.leadType === "AGENCY" ? "agency" : "single shop"} lead from ${data.name}${data.company ? ` @ ${data.company}` : ""}`,
    );

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#0f172a;padding:20px 28px;">
           <span style="color:#fff;font-size:18px;font-weight:700;">5-Star.AI</span>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
             <h2 style="margin:0 0 16px;font-size:20px;color:#0f172a;">New ${data.leadType === "AGENCY" ? "agency" : "single shop"} lead</h2>
             <p style="margin:0 0 20px;color:#555;font-size:14px;">A new 5-Star.AI lead just submitted the trial interest form. Reach out while it&#39;s fresh.</p>
            <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:6px;overflow:hidden;">
              ${rowsHtml}
            </table>
            <p style="margin:24px 0 0;font-size:12px;color:#999;">Request ID: ${esc(data.id)}${data.createdAt ? ` &middot; Submitted: ${esc(data.createdAt)}` : ""}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const deliveries = await Promise.allSettled(
      recipients.map((recipient) =>
        clerkClient.emails.create({
          from: { address: CLERK_FROM_EMAIL },
          to: { address: recipient },
          subject,
          html,
        }),
      ),
    );
    const failures = deliveries.filter(
      (delivery): delivery is PromiseRejectedResult =>
        delivery.status === "rejected",
    );
    const result = summarizeAlertDelivery(recipients.length, failures.length);
    if (failures.length > 0) {
      console.error(
        `[notificationService] Clerk demo-request alert failed for ${failures.length} recipient(s).`,
        failures[0]?.reason,
      );
    } else {
      console.info(
        "[notificationService] Demo-request alert email sent through Clerk to:",
        recipients.join(", "),
      );
    }
    return result;
  } catch (err) {
    console.error(
      "[notificationService] Failed to send demo-request alert:",
      err,
    );
    return {
      status: "FAILED",
      recipientCount: recipients.length,
      deliveredCount: 0,
      failedCount: recipients.length,
      error: "Alert could not be submitted through Clerk.",
    };
  }
}

/** Notify every active owner in the affected organization. The caller passes
 * already-authorized recipients; this service only formats and sends mail. */
export async function sendPrivateFeedbackAlert(data: {
  recipients: string[];
  businessName: string;
  rating: number;
  message: string;
  contact: string | null;
  createdAt: string;
  isSpam: boolean;
}): Promise<AlertDeliveryResult> {
  if (data.recipients.length === 0) return summarizeAlertDelivery(0, 0);

  try {
    const rows = [
      ["Business", data.businessName],
      ["Rating", `${data.rating}/5`],
      ["Message", data.message],
      ...(data.contact ? [["Contact", data.contact] as [string, string]] : []),
    ];
    const rowsHtml = rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:6px 12px;font-weight:600;color:#555;vertical-align:top;white-space:nowrap;">${esc(label)}</td><td style="padding:6px 12px;color:#222;">${esc(value)}</td></tr>`,
      )
      .join("\n");
    const spamNotice = data.isSpam
      ? `<p style="margin:0 0 16px;padding:10px 12px;border:1px solid #fcd34d;background:#fffbeb;color:#78350f;border-radius:6px;font-size:13px;"><strong>Quality flag:</strong> This message looks promotional or automated. Review it before taking action.</p>`
      : "";
    const subject = escSubject(`New private feedback for ${data.businessName}`);
    const html = `<!DOCTYPE html><html lang="en"><body style="margin:0;padding:32px 16px;font-family:Arial,sans-serif;background:#f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;"><tr><td style="background:#0f172a;padding:20px 28px;color:#fff;font-size:18px;font-weight:700;">5-Star.AI</td></tr><tr><td style="padding:28px;"><h2 style="margin:0 0 16px;color:#0f172a;">New private feedback</h2>${spamNotice}<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f9fafb;">${rowsHtml}</table><p style="margin:24px 0 0;font-size:12px;color:#999;">Received: ${esc(data.createdAt)}</p></td></tr></table></td></tr></table></body></html>`;
    const deliveries = await Promise.allSettled(
      data.recipients.map((recipient) =>
        clerkClient.emails.create({
          from: { address: CLERK_FROM_EMAIL },
          to: { address: recipient },
          subject,
          html,
        }),
      ),
    );
    const failures = deliveries.filter(
      (delivery): delivery is PromiseRejectedResult =>
        delivery.status === "rejected",
    );
    const result = summarizeAlertDelivery(data.recipients.length, failures.length);
    if (failures.length > 0) {
      console.error(
        `[notificationService] Clerk private-feedback alert failed for ${failures.length} recipient(s).`,
        failures[0]?.reason,
      );
    }
    return result;
  } catch (err) {
    console.error(
      "[notificationService] Failed to send private-feedback alert:",
      err,
    );
    return {
      status: "FAILED",
      recipientCount: data.recipients.length,
      deliveredCount: 0,
      failedCount: data.recipients.length,
      error: "Alert could not be submitted through Clerk.",
    };
  }
}
