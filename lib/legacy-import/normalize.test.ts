import { describe, expect, it } from "vitest";
import { computeLegacySaleRowKey, mapPaymentMode, mapPaymentStatus, normalizeLegacyDate, normalizeName, normalizeToE164, toAmount } from "./normalize";

describe("normalizeName", () => {
  it("collapses internal whitespace and trims", () => {
    expect(normalizeName("Ashutosh  Tiwari")).toBe("Ashutosh Tiwari");
    expect(normalizeName("  Akhand Singh  ")).toBe("Akhand Singh");
  });
  it("handles null/undefined", () => {
    expect(normalizeName(null)).toBe("");
    expect(normalizeName(undefined)).toBe("");
  });
});

describe("normalizeToE164", () => {
  it("prepends 91 to a bare 10-digit number", () => {
    expect(normalizeToE164("9137813953")).toBe("919137813953");
  });
  it("passes through an already-prefixed number unchanged", () => {
    expect(normalizeToE164("919137813953")).toBe("919137813953");
  });
  it("returns null for empty input", () => {
    expect(normalizeToE164("")).toBeNull();
  });
});

describe("normalizeLegacyDate", () => {
  it("parses ISO YYYY-MM-DD (sales sheet format)", () => {
    expect(normalizeLegacyDate("2026-08-25")).toBe("2026-08-25");
  });
  it("parses DD-MM-YYYY (customers sheet format)", () => {
    expect(normalizeLegacyDate("26-08-2026")).toBe("2026-08-26");
    expect(normalizeLegacyDate("26-11-2009")).toBe("2009-11-26");
  });
  it("parses D/M/YYYY", () => {
    expect(normalizeLegacyDate("1/2/2026")).toBe("2026-02-01");
  });
  it("converts an Excel serial date number (defensive fallback)", () => {
    // 46259 = 2026-08-25 in the Excel 1900 date system (epoch 1899-12-30).
    expect(normalizeLegacyDate(46259)).toBe("2026-08-25");
  });
  it("rejects an invalid calendar date", () => {
    expect(normalizeLegacyDate("31-02-2026")).toBeNull();
    expect(normalizeLegacyDate("2026-13-01")).toBeNull();
  });
  it("returns null for blank/missing input", () => {
    expect(normalizeLegacyDate("")).toBeNull();
    expect(normalizeLegacyDate(null)).toBeNull();
    expect(normalizeLegacyDate(undefined)).toBeNull();
  });
  it("returns null for unparseable garbage", () => {
    expect(normalizeLegacyDate("not a date")).toBeNull();
  });
});

describe("toAmount", () => {
  it("passes through numbers", () => {
    expect(toAmount(800)).toBe(800);
  });
  it("parses numeric strings, stripping commas", () => {
    expect(toAmount("1,200")).toBe(1200);
  });
  it("defaults blank/invalid to 0", () => {
    expect(toAmount("")).toBe(0);
    expect(toAmount(undefined)).toBe(0);
    expect(toAmount("abc")).toBe(0);
  });
});

describe("computeLegacySaleRowKey", () => {
  it("is stable for the same customer + row index", () => {
    expect(computeLegacySaleRowKey("YDL-3498045", 2)).toBe(computeLegacySaleRowKey("YDL-3498045", 2));
  });
  it("differs across row indexes even for the same customer", () => {
    expect(computeLegacySaleRowKey("YDL-3498045", 2)).not.toBe(computeLegacySaleRowKey("YDL-3498045", 3));
  });
});

describe("mapPaymentStatus", () => {
  it("maps PD to paid", () => {
    expect(mapPaymentStatus("PD", 800, 800).status).toBe("paid");
  });
  it("maps PI to partial when paid < total", () => {
    const result = mapPaymentStatus("PI", 800, 400);
    expect(result.status).toBe("partial");
    expect(result.warning).toBeUndefined();
  });
  it("maps PI to paid when paid >= total, matching the real export's PI-but-fully-paid rows", () => {
    // This is the exact anomaly seen in the real export (566 rows have status "PI" with
    // paid == total) — the explicit PD/PI rule resolves it to "paid", which also matches the
    // amount-derived status, so no warning fires here (the rule already reconciles them).
    const result = mapPaymentStatus("PI", 800, 800);
    expect(result.status).toBe("paid");
    expect(result.warning).toBeUndefined();
  });
  it("warns when PD (paid) disagrees with an amount that hasn't actually been paid in full", () => {
    const result = mapPaymentStatus("PD", 800, 400);
    expect(result.status).toBe("paid");
    expect(result.warning).toBeDefined();
  });
  it("falls back to the amount-derived status for an unrecognized code", () => {
    const result = mapPaymentStatus("", 800, 0);
    expect(result.status).toBe("unpaid");
  });
});

describe("mapPaymentMode", () => {
  it("maps known legacy modes", () => {
    expect(mapPaymentMode("Cash")).toBe("cash");
    expect(mapPaymentMode("UPI")).toBe("upi");
    expect(mapPaymentMode("Google Pay")).toBe("upi");
    expect(mapPaymentMode("Paytm")).toBe("upi");
    expect(mapPaymentMode("Credit Card")).toBe("card");
    expect(mapPaymentMode("Online")).toBe("other");
  });
  it("returns null for blank", () => {
    expect(mapPaymentMode(" ")).toBeNull();
  });
  it("falls back to other for an unrecognized mode", () => {
    expect(mapPaymentMode("Cheque")).toBe("other");
  });
});
