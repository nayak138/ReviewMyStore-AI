import { describe, expect, it } from "vitest";
import { csvCell, csvSection } from "./analytics-csv";

describe("analytics CSV cells", () => {
  it("escapes ordinary values without changing their content", () => {
    expect(csvCell('A "quoted" value')).toBe('"A ""quoted"" value"');
    expect(csvCell(42)).toBe('"42"');
    expect(csvCell(null)).toBe('""');
  });

  it("forces formula-looking values to plain text after whitespace or controls", () => {
    const dangerousValues = [
      "=1+1",
      "+SUM(A1)",
      "-10",
      "@cmd",
      " =1+1",
      "\t+SUM(A1)",
      "\n-10",
      "\r@cmd",
      "\u0000=1+1",
      "\u007F+SUM(A1)",
      "\uFEFF=1+1",
    ];

    for (const value of dangerousValues) {
      expect(csvCell(value)).toBe(`"'${value}"`);
    }
  });

  it("applies the same protection to every section cell", () => {
    expect(csvSection(" =title", ["\t+header"], [["\n-unsafe", "safe"]])).toBe(
      `"' =title"\r\n"'\t+header"\r\n"'\n-unsafe","safe"`,
    );
  });
});
