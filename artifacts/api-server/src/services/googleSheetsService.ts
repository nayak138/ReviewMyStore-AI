import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "../lib/logger";

const LEADS_SPREADSHEET_ID = "1Ycdrp2n3wLFipgdJuFIWRsw87xna-LrTK39nkyuGu2g";
const LEADS_RANGE = "Leads!A1";

type LeadSheetRow = {
  id: string;
  createdAt: string;
  name: string;
  leadType: "AGENCY" | "SINGLE_SHOP";
  company?: string | null;
  phone?: string | null;
  email?: string | null;
};

function displayLeadType(leadType: LeadSheetRow["leadType"]) {
  return leadType === "AGENCY" ? "Agency" : "Single Shop";
}

/**
 * Appends a newly submitted marketing lead to the connected Google Sheet.
 * The database remains the source of truth when the external write is unavailable.
 */
export async function appendLeadToGoogleSheet(data: LeadSheetRow): Promise<void> {
  if (process.env.GOOGLE_SHEETS_LEADS_SYNC === "false") return;

  try {
    const connectors = new ReplitConnectors();
    const range = encodeURIComponent(LEADS_RANGE);
    const response = await connectors.proxy(
      "google-sheet",
      `/v4/spreadsheets/${LEADS_SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: [[
            `LD-${data.id.slice(0, 8).toUpperCase()}`,
            new Date(data.createdAt).toISOString().slice(0, 10),
            data.name,
            displayLeadType(data.leadType),
            data.company ?? "",
            data.phone ?? "",
            data.email ?? "",
            "Website",
            "New Lead",
            "No",
            "",
            "",
            "",
            "",
            "Submitted via 5-Star.AI lead form",
          ]],
        }),
      },
    );

    if (!response.ok) {
      const responseBody = await response.text();
      logger.error(
        { status: response.status, responseBody: responseBody.slice(0, 500) },
        "Google Sheets lead append failed",
      );
    }
  } catch (error) {
    logger.error({ err: error }, "Google Sheets lead append failed");
  }
}