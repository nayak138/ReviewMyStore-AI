import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { clerkClient } from "@clerk/express";
import {
  sendAgencyOwnerInvitationEmail,
  sendDemoRequestAlert,
  sendPrivateFeedbackAlert,
  sendTeamInvitationEmail,
} from "./notificationService.ts";

type CreateEmail = typeof clerkClient.emails.create;
type EmailPayload = Parameters<CreateEmail>[0];

const originalCreate = clerkClient.emails.create.bind(clerkClient.emails);
const submitted: EmailPayload[] = [];
let createError: Error | null = null;

before(() => {
  clerkClient.emails.create = (async (payload: EmailPayload) => {
    submitted.push(payload);
    if (createError) throw createError;
    return {} as Awaited<ReturnType<CreateEmail>>;
  }) as CreateEmail;
});

after(() => {
  clerkClient.emails.create = originalCreate;
});

beforeEach(() => {
  submitted.length = 0;
  createError = null;
});

test("agency and teammate invitations submit through Clerk with the configured sender", async () => {
  const agencyResult = await sendAgencyOwnerInvitationEmail({
    to: "owner@example.com",
    agencyName: "Northstar Agency",
    expiresAt: "2026-10-07T12:00:00.000Z",
    joinUrl: "https://5-star.ai/agency/join/agency-token",
  });
  const teamResult = await sendTeamInvitationEmail({
    to: "teammate@example.com",
    agencyName: "Northstar Agency",
    businessName: "Northstar Coffee",
    inviterName: "Morgan Lee",
    invitedEmail: "teammate@example.com",
    expiresAt: "2026-10-07T12:00:00.000Z",
    joinUrl: "https://5-star.ai/team/join/team-token",
    grants: {
      campaignsPermission: "VIEW",
      reviewInboxPermission: "MANAGE",
      feedbackPermission: "NONE",
      socialMediaPermission: "NONE",
      analyticsPermission: "VIEW",
    },
  });

  assert.deepEqual(agencyResult, { sent: true });
  assert.deepEqual(teamResult, { sent: true });
  assert.equal(submitted.length, 2);
  assert.deepEqual(submitted.map((email) => email.from), [
    { address: "notifications@5-star.ai" },
    { address: "notifications@5-star.ai" },
  ]);
  assert.deepEqual(submitted.map((email) => email.to), [
    { address: "owner@example.com" },
    { address: "teammate@example.com" },
  ]);
  assert.match(submitted[0]?.subject ?? "", /Northstar Agency/);
  assert.match(submitted[1]?.subject ?? "", /Northstar Coffee/);
  assert.match(submitted[1]?.text ?? "", /reviewInbox: MANAGE/);
});

test("demo-request and private-feedback alerts submit one Clerk email per recipient", async () => {
  const previousRecipients = process.env.DEMO_ALERT_EMAILS;
  process.env.DEMO_ALERT_EMAILS = "first@example.com, second@example.com";

  try {
    await sendDemoRequestAlert({
      id: "demo-123",
      name: "Jamie Customer",
      leadType: "AGENCY",
      company: "Jamie Co",
      email: "jamie@example.com",
    });
    await sendPrivateFeedbackAlert({
      recipients: ["owner-a@example.com", "owner-b@example.com"],
      businessName: "Northstar Coffee",
      rating: 2,
      message: "The service was slow.",
      contact: null,
      createdAt: "2026-09-23T12:00:00.000Z",
      isSpam: false,
    });
  } finally {
    if (previousRecipients === undefined) delete process.env.DEMO_ALERT_EMAILS;
    else process.env.DEMO_ALERT_EMAILS = previousRecipients;
  }

  assert.equal(submitted.length, 4);
  assert.ok(submitted.every((email) => email.from?.address === "notifications@5-star.ai"));
  assert.deepEqual(
    submitted.map((email) => email.to.address),
    [
      "first@example.com",
      "second@example.com",
      "owner-a@example.com",
      "owner-b@example.com",
    ],
  );
  assert.match(submitted[0]?.subject ?? "", /agency lead/);
  assert.match(submitted[2]?.subject ?? "", /private feedback/);
});

test("invitation failures return a visible delivery failure instead of throwing", async () => {
  createError = new Error("Clerk rejected the submission");

  const result = await sendTeamInvitationEmail({
    to: "failed@example.com",
    agencyName: "Northstar Agency",
    businessName: "Northstar Coffee",
    inviterName: "Morgan Lee",
    invitedEmail: "failed@example.com",
    expiresAt: "2026-10-07T12:00:00.000Z",
    joinUrl: "https://5-star.ai/team/join/team-token",
    grants: { campaignsPermission: "VIEW" },
  });

  assert.deepEqual(result, {
    sent: false,
    error: "Invitation email could not be submitted through Clerk.",
  });
});

test("alert failures are contained so demo and feedback submissions can complete", async () => {
  createError = new Error("Clerk unavailable");
  process.env.DEMO_ALERT_EMAILS = "alerts@example.com";

  try {
    await assert.doesNotReject(() =>
      sendDemoRequestAlert({ id: "demo-456", name: "Taylor Customer" }),
    );
    await assert.doesNotReject(() =>
      sendPrivateFeedbackAlert({
        recipients: ["owner@example.com"],
        businessName: "Northstar Coffee",
        rating: 1,
        message: "Needs attention.",
        contact: null,
        createdAt: "2026-09-23T12:00:00.000Z",
        isSpam: false,
      }),
    );
  } finally {
    delete process.env.DEMO_ALERT_EMAILS;
  }
});