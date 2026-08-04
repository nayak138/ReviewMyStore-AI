import QRCode from "qrcode";
import PDFDocument from "pdfkit";

export type QrFormat = "png" | "svg" | "pdf";

export interface QrAssetInput {
  /** Absolute short-link URL the QR encodes, e.g. https://host/r/abc123 */
  url: string;
  businessName: string;
  campaignName: string;
  brandColor: string | null;
}

const QR_OPTIONS = {
  errorCorrectionLevel: "H" as const,
  margin: 2,
};

export async function generateQrPng(input: QrAssetInput): Promise<Buffer> {
  return QRCode.toBuffer(input.url, {
    ...QR_OPTIONS,
    type: "png",
    width: 1200,
  });
}

export async function generateQrSvg(input: QrAssetInput): Promise<Buffer> {
  const svg = await QRCode.toString(input.url, { ...QR_OPTIONS, type: "svg" });
  return Buffer.from(svg, "utf8");
}

const INCH = 72; // PDF points per inch

/** Print-ready 4in x 6in portrait card for standees: brand-colored header,
 * large centered QR, call-to-action, and the short URL as fallback text. */
export async function generateQrPdf(input: QrAssetInput): Promise<Buffer> {
  const width = 4 * INCH;
  const height = 6 * INCH;
  const brand = input.brandColor ?? "#4285F4";

  // Rasterize the QR at high resolution so the embedded image prints crisply.
  const qrPng = await QRCode.toBuffer(input.url, {
    ...QR_OPTIONS,
    type: "png",
    width: 1200,
  });

  const doc = new PDFDocument({ size: [width, height], margin: 0 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // Header band
  doc.rect(0, 0, width, 1.1 * INCH).fill(brand);
  doc
    .fillColor("#FFFFFF")
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(input.businessName, 0.25 * INCH, 0.3 * INCH, {
      width: width - 0.5 * INCH,
      align: "center",
      ellipsis: true,
      height: 0.5 * INCH,
    });
  doc
    .font("Helvetica")
    .fontSize(11)
    .text("We'd love your feedback!", 0.25 * INCH, 0.72 * INCH, {
      width: width - 0.5 * INCH,
      align: "center",
    });

  // QR code, centered
  const qrSize = 2.6 * INCH;
  doc.image(qrPng, (width - qrSize) / 2, 1.45 * INCH, {
    width: qrSize,
    height: qrSize,
  });

  // Call to action
  doc
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("Scan to leave us a review", 0.25 * INCH, 4.3 * INCH, {
      width: width - 0.5 * INCH,
      align: "center",
    });
  doc
    .fillColor("#4B5563")
    .font("Helvetica")
    .fontSize(10)
    .text(
      `Point your phone camera at the code — it takes less than a minute.`,
      0.4 * INCH,
      4.62 * INCH,
      { width: width - 0.8 * INCH, align: "center" },
    );

  // Footer: campaign label + fallback URL
  doc
    .fillColor("#9CA3AF")
    .fontSize(8)
    .text(input.campaignName, 0.25 * INCH, 5.45 * INCH, {
      width: width - 0.5 * INCH,
      align: "center",
    });
  doc
    .fillColor(brand)
    .fontSize(9)
    .text(input.url, 0.25 * INCH, 5.62 * INCH, {
      width: width - 0.5 * INCH,
      align: "center",
    });

  doc.end();
  return done;
}

export async function generateQrAsset(
  format: QrFormat,
  input: QrAssetInput,
): Promise<{ body: Buffer; contentType: string; extension: string }> {
  switch (format) {
    case "png":
      return {
        body: await generateQrPng(input),
        contentType: "image/png",
        extension: "png",
      };
    case "svg":
      return {
        body: await generateQrSvg(input),
        contentType: "image/svg+xml",
        extension: "svg",
      };
    case "pdf":
      return {
        body: await generateQrPdf(input),
        contentType: "application/pdf",
        extension: "pdf",
      };
  }
}
