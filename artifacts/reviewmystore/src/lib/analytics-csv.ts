export type CsvValue = string | number | null | undefined;

/**
 * Escape a CSV cell and force spreadsheet formula-looking values to text.
 * The marker check intentionally includes leading whitespace and control
 * characters because spreadsheet programs may ignore them before evaluating a
 * formula.
 */
export function csvCell(value: CsvValue): string {
  const text = String(value ?? "");
  const protectedText = /^[\s\x00-\x1F\x7F]*[=+\-@]/.test(text)
    ? `'${text}`
    : text;
  return `"${protectedText.replace(/"/g, '""')}"`;
}

export function csvSection(
  title: string,
  headers: string[],
  rows: CsvValue[][],
): string {
  return [
    csvCell(title),
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\r\n");
}
