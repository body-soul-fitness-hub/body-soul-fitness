import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { CUSTOMER_COLUMNS, SALE_COLUMNS } from "./columns";
import { parseCustomersWorkbook, parseSalesWorkbook } from "./parse";

function bufferFromRows(headers: readonly string[], rows: unknown[][]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet([headers as string[], ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("parseCustomersWorkbook", () => {
  const headers = Object.values(CUSTOMER_COLUMNS);

  it("parses rows into LegacyCustomerRow objects with 1-based rowIndex starting at 2", () => {
    const buffer = bufferFromRows(headers, [
      ["YDL-1", "Test Person", "+91", "9137813953", "", "male", "26-08-2026", "26-08-2026", "", "", "", "", "", "", "", "Active", "", "", "", "919137813953", ""],
    ]);
    const { rows, parseErrors } = parseCustomersWorkbook(buffer);
    expect(parseErrors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].rowIndex).toBe(2);
    expect(rows[0].code).toBe("YDL-1");
    expect(rows[0].number).toBe("9137813953");
  });

  it("reports a parse error when a required column is missing", () => {
    const badHeaders = headers.filter((h) => h !== CUSTOMER_COLUMNS.code);
    const buffer = bufferFromRows(badHeaders, [["Test", "+91", "9137813953"]]);
    const { rows, parseErrors } = parseCustomersWorkbook(buffer);
    expect(rows).toHaveLength(0);
    expect(parseErrors.length).toBeGreaterThan(0);
  });

  it("skips fully blank trailing rows", () => {
    const buffer = bufferFromRows(headers, [
      ["YDL-1", "Test Person", "+91", "9137813953", "", "male", "", "", "", "", "", "", "", "", "", "Active", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ]);
    const { rows } = parseCustomersWorkbook(buffer);
    expect(rows).toHaveLength(1);
  });
});

describe("parseSalesWorkbook", () => {
  const headers = Object.values(SALE_COLUMNS);

  it("parses amount columns as numbers", () => {
    const buffer = bufferFromRows(headers, [
      ["INV-1", "2026-08-25", "YDL-1", "Test", "", "9792187737", "", "Silver Plan", "2026-07-10", "2026-08-09", "EX", 800, 0, 800, "PD", "", "", "Cash", "", "", "", 800, "", ""],
    ]);
    const { rows, parseErrors } = parseSalesWorkbook(buffer);
    expect(parseErrors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].netSaleAmount).toBe(800);
    expect(rows[0].totalSaleAmount).toBe(800);
    expect(rows[0].paidAmount).toBe(800);
    expect(rows[0].rowIndex).toBe(2);
  });
});
