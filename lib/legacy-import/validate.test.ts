import { describe, expect, it } from "vitest";
import { validateImport } from "./validate";
import type { ExistingMemberLookup, LegacyCustomerRow, LegacySaleRow } from "./types";

function customer(overrides: Partial<LegacyCustomerRow> = {}): LegacyCustomerRow {
  return {
    rowIndex: 2,
    code: "YDL-1",
    name: "Test Person",
    isdCode: "+91",
    number: "9137813953",
    email: "",
    gender: "male",
    dateOfEnquiry: "26-08-2026",
    conversionDate: "26-08-2026",
    handledBy: "",
    notes: "",
    leadType: "",
    sourceOfPromo: "",
    employmentType: "",
    appInstalled: "",
    assignedTrainer: "",
    membershipStatus: "Active",
    dob: "",
    address: "",
    emergencyContactNo: "",
    whatsappNumbers: "",
    referenceNo: "",
    ...overrides,
  };
}

function sale(overrides: Partial<LegacySaleRow> = {}): LegacySaleRow {
  return {
    rowIndex: 2,
    invoiceNo: "INV-1",
    invoiceDate: "2026-08-25",
    customerId: "YDL-1",
    customerName: "Test Person",
    customerEmail: "",
    customerPhone: "",
    customerAlternatePhone: "",
    planName: "Silver Plan",
    startDate: "2026-07-10",
    endDate: "2026-08-09",
    planStatus: "EX",
    netSaleAmount: 800,
    gst: 0,
    totalSaleAmount: 800,
    paymentStatus: "PD",
    trainerName: "",
    trainerId: "",
    paymentType: "Cash",
    staffName: "",
    staffId: "",
    sourceOfPromotion: "",
    paidAmount: 800,
    referenceNumber: "",
    note: "",
    ...overrides,
  };
}

const emptyLookup: ExistingMemberLookup = { byLegacyCode: new Map(), byNormalizedPhone: new Map() };

describe("validateImport", () => {
  it("passes a clean single customer + sale row with no errors", () => {
    const summary = validateImport([customer()], [sale()], emptyLookup);
    expect(summary.errors).toHaveLength(0);
    expect(summary.customerRows).toBe(1);
    expect(summary.salesRows).toBe(1);
    expect(summary.joinedRows).toBe(1);
    expect(summary.customersWithoutSales).toBe(0);
  });

  it("counts customers without any matching sale row", () => {
    const summary = validateImport([customer({ code: "YDL-1" }), customer({ code: "YDL-2", rowIndex: 3 })], [sale({ customerId: "YDL-1" })], emptyLookup);
    expect(summary.customersWithoutSales).toBe(1);
  });

  it("flags duplicate customer codes within the file and blocks both rows", () => {
    const rows = [customer({ code: "YDL-1", rowIndex: 2 }), customer({ code: "YDL-1", rowIndex: 3 })];
    const summary = validateImport(rows, [], emptyLookup);
    expect(summary.errors.some((e) => e.code === "duplicate_customer_code")).toBe(true);
    expect(summary.blockedCustomerRowIndexes).toEqual(expect.arrayContaining([2, 3]));
  });

  it("flags an unparseable phone number", () => {
    const summary = validateImport([customer({ number: "12345" })], [], emptyLookup);
    expect(summary.errors.some((e) => e.code === "invalid_phone")).toBe(true);
  });

  it("flags an unparseable conversion date and blocks the row (no fabricated join_date)", () => {
    const summary = validateImport([customer({ conversionDate: "not a date" })], [], emptyLookup);
    expect(summary.errors.some((e) => e.code === "invalid_conversion_date")).toBe(true);
    expect(summary.blockedCustomerRowIndexes).toContain(2);
  });

  it("flags a sale row whose Customer ID has no matching customer row", () => {
    const summary = validateImport([customer({ code: "YDL-1" })], [sale({ customerId: "YDL-999" })], emptyLookup);
    expect(summary.errors.some((e) => e.code === "unmatched_sale_customer")).toBe(true);
  });

  it("flags end date before start date", () => {
    const summary = validateImport([customer()], [sale({ startDate: "2026-08-09", endDate: "2026-07-10" })], emptyLookup);
    expect(summary.errors.some((e) => e.code === "end_before_start")).toBe(true);
  });

  it("flags negative amounts", () => {
    const summary = validateImport([customer()], [sale({ paidAmount: -10 })], emptyLookup);
    expect(summary.errors.some((e) => e.code === "negative_amount")).toBe(true);
  });

  it("flags an unparseable sale date", () => {
    const summary = validateImport([customer()], [sale({ startDate: "garbage" })], emptyLookup);
    expect(summary.errors.some((e) => e.code === "invalid_sale_dates")).toBe(true);
  });

  it("warns (non-blocking) on duplicate content across sale rows for the same customer/plan/dates", () => {
    const summary = validateImport(
      [customer()],
      [sale({ rowIndex: 2 }), sale({ rowIndex: 3 })],
      emptyLookup
    );
    expect(summary.warnings.some((w) => w.code === "duplicate_sale_content")).toBe(true);
    expect(summary.errors).toHaveLength(0);
  });

  it("reports (does not silently merge) a phone collision with an existing member under a different legacy code", () => {
    const lookup: ExistingMemberLookup = {
      byLegacyCode: new Map(),
      byNormalizedPhone: new Map([["919137813953", { id: "existing-1", full_name: "Someone Else", mobile_number: "919137813953", legacy_customer_code: null }]]),
    };
    const summary = validateImport([customer({ number: "9137813953" })], [], lookup);
    expect(summary.errors.some((e) => e.code === "member_mismatch")).toBe(true);
  });

  it("does not flag a mismatch when the phone match is the same legacy code (an idempotent re-run)", () => {
    const lookup: ExistingMemberLookup = {
      byLegacyCode: new Map([["YDL-1", { id: "existing-1", full_name: "Test Person", mobile_number: "919137813953" }]]),
      byNormalizedPhone: new Map([["919137813953", { id: "existing-1", full_name: "Test Person", mobile_number: "919137813953", legacy_customer_code: "YDL-1" }]]),
    };
    const summary = validateImport([customer({ number: "9137813953" })], [], lookup);
    expect(summary.errors.some((e) => e.code === "member_mismatch")).toBe(false);
  });
});
