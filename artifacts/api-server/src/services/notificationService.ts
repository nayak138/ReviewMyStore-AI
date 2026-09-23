import { ReplitConnectors } from "@replit/connectors-sdk";

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

function configuredSender(): string | null {
  const sender = process.env.RESEND_FROM_EMAIL?.trim();
  if (sender) return sender;
  console.warn(
    "[notificationService] RESEND_FROM_EMAIL is not configured with a verified sender — skipping email notification.",
  );
  return null;
}

export type InvitationDeliveryResult = {
  sent: boolean;
  error?: string;
};

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

async function sendInvitationEmail(input: {
  to: string;
  subject: string;
  title: string;
  intro: string;
  rows: Array<[string, string]>;
  buttonLabel: string;
  joinUrl: string;
  text: string;
}): Promise<InvitationDeliveryResult> {
  try {
    const sender = configuredSender();
    if (!sender) return { sent: false, error: "Email sender is not configured." };
    const rowsHtml = input.rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:8px 12px;font-weight:600;color:#475569;white-space:nowrap;">${esc(label)}</td><td style="padding:8px 12px;color:#0f172a;">${esc(value)}</td></tr>`,
      )
      .join("");
    const safeUrl = esc(input.joinUrl);
    const html = `<!doctype html><html lang="en"><body style="margin:0;padding:32px 16px;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;"><tr><td style="padding:22px 28px;background:#0f172a;color:#fff;font-size:20px;font-weight:700;">5-Star.AI</td></tr><tr><td style="padding:32px 28px;"><h1 style="margin:0 0 14px;font-size:24px;">${esc(input.title)}</h1><p style="margin:0 0 22px;color:#475569;line-height:1.6;">${esc(input.intro)}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f8fafc;border-radius:8px;">${rowsHtml}</table><p style="margin:28px 0;text-align:center;"><a href="${safeUrl}" style="display:inline-block;padding:13px 22px;border-radius:8px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700;">${esc(input.buttonLabel)}</a></p><p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">If the button does not work, copy and paste this link:<br><span style="word-break:break-all;">${safeUrl}</span></p></td></tr></table></td></tr></table></body></html>`;
    const response = await new ReplitConnectors().proxy("resend", "/emails", {
      method: "POST",
      body: JSON.stringify({
        from: sender,
        to: [input.to],
        subject: escSubject(input.subject),
        html,
        text: input.text,
      }),
    });
    if (!response.ok) {
      return {
        sent: false,
        error: `Email provider returned ${response.status}.`,
      };
    }
    return { sent: true };
  } catch (error) {
    console.error("[notificationService] Invitation email submission failed:", error);
    return { sent: false, error: "Invitation email could not be submitted." };
  }
}

export async function sendTeamInvitationEmail(
  data: TeamInvitationEmailData,
): Promise<InvitationDeliveryResult> {
  const permissions = Object.entries(data.grants)
    .filter(([, value]) => value !== "NONE")
    .map(([key, value]) => `${key.replace(/Permission$/, "")}: ${value}`)
    .join(", ");
  return sendInvitationEmail({
    to: data.to,
    subject: `Join ${data.businessName} on 5-Star.AI`,
    title: `You’re invited to join ${data.businessName}`,
    intro: `${data.inviterName} invited you to collaborate with ${data.agencyName}.`,
    rows: [
      ["Agency", data.agencyName],
      ["Business", data.businessName],
      ["Invited email", data.invitedEmail],
      ["Feature access", permissions],
      ["Expires", data.expiresAt],
    ],
    buttonLabel: "Join your team",
    joinUrl: data.joinUrl,
    text: `You’re invited to join ${data.businessName} on 5-Star.AI.\n\nAgency: ${data.agencyName}\nInvited by: ${data.inviterName}\nInvited email: ${data.invitedEmail}\nFeature access: ${permissions}\nExpires: ${data.expiresAt}\n\nJoin your team: ${data.joinUrl}`,
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
    subject: `Set up your ${data.agencyName} agency`,
    title: `Welcome to ${data.agencyName}`,
    intro: "Your agency workspace is ready. Set up your owner account to begin managing your businesses.",
    rows: [
      ["Agency", data.agencyName],
      ["Invited email", data.to],
      ["Expires", data.expiresAt],
    ],
    buttonLabel: "Set up your agency",
    joinUrl: data.joinUrl,
    text: `Your ${data.agencyName} agency workspace is ready.\n\nInvited email: ${data.to}\nExpires: ${data.expiresAt}\n\nSet up your agency: ${data.joinUrl}`,
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
}): Promise<void> {
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
    return;
  }

  try {
    const sender = configuredSender();
    if (!sender) return;
    const connectors = new ReplitConnectors();

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

    const payload = {
      from: sender,
      to: recipients,
      subject,
      html,
    };

    const response = await connectors.proxy("resend", "/emails", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(
        `[notificationService] Resend returned ${response.status}: ${body}`,
      );
    } else {
      console.info(
        "[notificationService] Demo-request alert email sent to:",
        recipients.join(", "),
      );
    }
  } catch (err) {
    console.error(
      "[notificationService] Failed to send demo-request alert:",
      err,
    );
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
}): Promise<void> {
  if (data.recipients.length === 0) return;

  try {
    const sender = configuredSender();
    if (!sender) return;
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
    const payload = {
      from: sender,
      to: data.recipients,
      subject: escSubject(
        `New private feedback for ${data.businessName}`,
      ),
      html: `<!DOCTYPE html><html lang="en"><body style="margin:0;padding:32px 16px;font-family:Arial,sans-serif;background:#f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;"><tr><td style="background:#0f172a;padding:20px 28px;color:#fff;font-size:18px;font-weight:700;">5-Star.AI</td></tr><tr><td style="padding:28px;"><h2 style="margin:0 0 16px;color:#0f172a;">New private feedback</h2>${spamNotice}<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f9fafb;">${rowsHtml}</table><p style="margin:24px 0 0;font-size:12px;color:#999;">Received: ${esc(data.createdAt)}</p></td></tr></table></td></tr></table></body></html>`,
    };
    const response = await new ReplitConnectors().proxy("resend", "/emails", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error(
        `[notificationService] Resend private-feedback alert failed: ${response.status} ${(await response.text()).slice(0, 500)}`,
      );
    }
  } catch (err) {
    console.error(
      "[notificationService] Failed to send private-feedback alert:",
      err,
    );
  }
}
