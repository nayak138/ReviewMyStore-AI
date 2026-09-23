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
type CreateInvitation = typeof clerkClient.invitations.createInvitation;
type InvitationPayload = Parameters<CreateInvitation>[0];

const originalCreateEmail = clerkClient.emails.create.bind(clerkClient.emails);
const originalCreateInvitation = clerkClient.invitations.createInvitation.bind(clerkClient.invitations);
const submittedEmails: EmailPayload[] = [];
const submittedInvitations: InvitationPayload[] = [];
let createEmailError: Error | null = null;
let createInvitationError: Error | null = null;
let createEmailErrorFor: ((payload: EmailPayload) => Error | null) | null = null;

before(() => {
  clerkClient.emails.create = (async (payload: EmailPayload) => {
    submittedEmails.push(payload);
    const targetedError = createEmailErrorFor?.(payload);
    if (targetedError) throw targetedError;
    if (createEmailError) throw createEmailError;
    return {} as Awaited<ReturnType<CreateEmail>>;
  }) as CreateEmail;
  clerkClient.invitations.createInvitation = (async (payload: InvitationPayload) => {
    submittedInvitations.push(payload);
    if (createInvitationError) throw createInvitationError;
    return {} as Awaited<ReturnType<CreateInvitation>>;
  }) as CreateInvitation;
});

after(() => {
  clerkClient.emails.create = originalCreateEmail;
  clerkClient.invitations.createInvitation = originalCreateInvitation;
});

beforeEach(() => {
  submittedEmails.length = 0;
  submittedInvitations.length = 0;
  createEmailError = null;
  createInvitationError = null;
  createEmailErrorFor = null;
});

test("agency and teammate invitations submit through Clerk with the local join URLs", async () => {
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const agencyResult = await sendAgencyOwnerInvitationEmail({
    to: "owner@example.com",
    agencyName: "Northstar Agency",
    expiresAt,
    joinUrl: "https://5-star.ai/agency/join/agency-token",
  });
  const teamResult = await sendTeamInvitationEmail({
    to: "teammate@example.com",
    agencyName: "Northstar Agency",
    businessName: "Northstar Coffee",
    inviterName: "Morgan Lee",
    invitedEmail: "teammate@example.com",
    expiresAt,
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
  assert.equal(submittedInvitations.length, 2);
  assert.deepEqual(submittedInvitations, [
    {
      emailAddress: "owner@example.com",
      expiresInDays: 14,
      ignoreExisting: true,
      notify: true,
      redirectUrl: "https://5-star.ai/agency/join/agency-token",
    },
    {
      emailAddress: "teammate@example.com",
      expiresInDays: 14,
      ignoreExisting: true,
      notify: true,
      redirectUrl: "https://5-star.ai/team/join/team-token",
    },
  ]);
});

test("demo-request and private-feedback alerts submit one Clerk email per recipient", async () => {
  const previousRecipients = process.env.DEMO_ALERT_EMAILS;
  process.env.DEMO_ALERT_EMAILS = "first@example.com, second@example.com";

  try {
    const demoResult = await sendDemoRequestAlert({
      id: "demo-123",
      name: "Jamie Customer",
      leadType: "AGENCY",
      company: "Jamie Co",
      email: "jamie@example.com",
    });
    const feedbackResult = await sendPrivateFeedbackAlert({
      recipients: ["owner-a@example.com", "owner-b@example.com"],
      businessName: "Northstar Coffee",
      rating: 2,
      message: "The service was slow.",
      contact: null,
      createdAt: "2026-09-23T12:00:00.000Z",
      isSpam: false,
    });
    assert.equal(demoResult.status, "SENT");
    assert.equal(feedbackResult.status, "SENT");
  } finally {
    if (previousRecipients === undefined) delete process.env.DEMO_ALERT_EMAILS;
    else process.env.DEMO_ALERT_EMAILS = previousRecipients;
  }

  assert.equal(submittedEmails.length, 4);
  assert.ok(submittedEmails.every((email) => email.from?.address === "notifications@5-star.ai"));
  assert.deepEqual(
    submittedEmails.map((email) => email.to.address),
    [
      "first@example.com",
      "second@example.com",
      "owner-a@example.com",
      "owner-b@example.com",
    ],
  );
  assert.match(submittedEmails[0]?.subject ?? "", /agency lead/);
  assert.match(submittedEmails[2]?.subject ?? "", /private feedback/);
});

test("alert delivery reports a partial result when one recipient is rejected", async () => {
  const previousRecipients = process.env.DEMO_ALERT_EMAILS;
  process.env.DEMO_ALERT_EMAILS = "good@example.com, bad@example.com";
  createEmailErrorFor = (payload) =>
    payload.to.address === "bad@example.com"
      ? new Error("Clerk rejected this recipient")
      : null;

  try {
    const result = await sendDemoRequestAlert({
      id: "demo-partial",
      name: "Partial Delivery",
    });

    assert.deepEqual(result, {
      status: "PARTIAL",
      recipientCount: 2,
      deliveredCount: 1,
      failedCount: 1,
      error: "1 of 2 alert recipients could not be submitted through Clerk.",
    });
  } finally {
    if (previousRecipients === undefined) delete process.env.DEMO_ALERT_EMAILS;
    else process.env.DEMO_ALERT_EMAILS = previousRecipients;
  }
});


test("invitation failures return a visible delivery failure instead of throwing", async () => {
  createInvitationError = new Error("Clerk rejected the submission");

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
  createEmailError = new Error("Clerk unavailable");
  const previousRecipients = process.env.DEMO_ALERT_EMAILS;
  process.env.DEMO_ALERT_EMAILS = "alerts@example.com";

  try {
    const demoResult = await sendDemoRequestAlert({ id: "demo-456", name: "Taylor Customer" });
    const feedbackResult = await sendPrivateFeedbackAlert({
      recipients: ["owner@example.com"],
      businessName: "Northstar Coffee",
      rating: 1,
      message: "Needs attention.",
      contact: null,
      createdAt: "2026-09-23T12:00:00.000Z",
      isSpam: false,
    });
    assert.equal(demoResult.status, "FAILED");
    assert.equal(feedbackResult.status, "FAILED");
  } finally {
    if (previousRecipients === undefined) delete process.env.DEMO_ALERT_EMAILS;
    else process.env.DEMO_ALERT_EMAILS = previousRecipients;
  }
});