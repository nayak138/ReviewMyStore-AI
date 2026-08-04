/** Builds a minimal vCard 3.0 file for a business and triggers a browser download. */
export interface VCardBusiness {
  name: string;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
}

function escapeVCard(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export function buildVCard(business: VCardBusiness): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  const name = escapeVCard(business.name);
  lines.push(`N:;${name};;;`);
  lines.push(`FN:${name}`);
  lines.push(`ORG:${name}`);
  if (business.phone) {
    lines.push(`TEL;TYPE=WORK,VOICE:${escapeVCard(business.phone)}`);
  }
  if (business.address) {
    // ADR fields: PO Box;Extended;Street;City;State;Zip;Country — we only have a
    // single formatted string, so put it all in the "street" field.
    lines.push(`ADR;TYPE=WORK:;;${escapeVCard(business.address)};;;;`);
  }
  if (business.website) {
    lines.push(`URL:${escapeVCard(business.website)}`);
  }
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export function downloadVCard(business: VCardBusiness): void {
  const vcard = buildVCard(business);
  const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const fileName = business.name.trim().replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "") || "contact";
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
