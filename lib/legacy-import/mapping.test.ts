import { describe, expect, it } from "vitest";
import { mapCustomerRowToMemberInsert, mapSaleRowToInsertParams } from "./mapping";
import type { LegacyCustomerRow, LegacySaleRow } from "./types";

const customerRow: LegacyCustomerRow = {
  rowIndex: 2,
  code: "YDL-294407245",
  name: "Ashutosh  Tiwari",
  isdCode: "+91",
  number: "9137813953",
  email: "",
  gender: "male",
  dateOfEnquiry: "26-08-2026",
  conversionDate: "26-08-2026",
  handledBy: "Harshdeep Singh",
  notes: "",
  leadType: "0",
  sourceOfPromo: "Walk In",
  employmentType: "STUDENT",
  appInstalled: "No",
  assignedTrainer: "Harshdeep Singh",
  membershipStatus: "Active",
  dob: "",
  address: "bharatNagar",
  emergencyContactNo: "",
  whatsappNumbers: "919137813953",
  referenceNo: "",
};

const saleRow: LegacySaleRow = {
  rowIndex: 2,
  invoiceNo: "B&S01029/2026",
  invoiceDate: "2026-08-25",
  customerId: "YDL-3498045",
  customerName: "Aditya Singh",
  customerEmail: "",
  customerPhone: "9792187737",
  customerAlternatePhone: "",
  planName: "Silver Plan- 1 Month",
  startDate: "2026-07-10",
  endDate: "2026-08-09",
  planStatus: "EX",
  netSaleAmount: 800,
  gst: 0,
  totalSaleAmount: 800,
  paymentStatus: "PI",
  trainerName: "",
  trainerId: "",
  paymentType: "UPI",
  staffName: "Harshdeep Singh",
  staffId: "1262041",
  sourceOfPromotion: "Unknown",
  paidAmount: 800,
  referenceNumber: "",
  note: "",
};

describe("mapCustomerRowToMemberInsert", () => {
  it("normalizes name, phone, and whatsapp number", () => {
    const result = mapCustomerRowToMemberInsert(customerRow, "batch-1", "2026-08-26");
    expect(result.full_name).toBe("Ashutosh Tiwari");
    expect(result.mobile_number).toBe("919137813953");
    expect(result.whatsapp_number).toBe("919137813953");
    expect(result.legacy_customer_code).toBe("YDL-294407245");
    expect(result.join_date).toBe("2026-08-26");
  });

  it("lowercases gender and nulls out blank optional fields", () => {
    const result = mapCustomerRowToMemberInsert(customerRow, "batch-1", "2026-08-26");
    expect(result.gender).toBe("male");
    expect(result.email).toBeNull();
    expect(result.emergency_contact_number).toBeNull();
  });

  it("stows opaque legacy fields in legacy_metadata, never as portal-access signals", () => {
    const result = mapCustomerRowToMemberInsert(customerRow, "batch-1", "2026-08-26");
    expect(result.legacy_metadata).toMatchObject({
      source: "Walk In",
      employment_type: "STUDENT",
      lead_type: "0",
      app_installed: "No",
      legacy_status: "Active",
    });
  });
});

describe("mapSaleRowToInsertParams", () => {
  it("uses Total Sale Amount as final_amount and Net Sale Amount as standard_price", () => {
    const result = mapSaleRowToInsertParams(saleRow, "2026-07-10", "2026-08-09");
    expect(result.standardPrice).toBe(800);
    expect(result.finalAmount).toBe(800);
    expect(result.amountPaid).toBe(800);
  });

  it("resolves the PI/fully-paid anomaly to paid, per derived amounts", () => {
    const result = mapSaleRowToInsertParams(saleRow, "2026-07-10", "2026-08-09");
    expect(result.paymentStatus).toBe("paid");
  });

  it("maps UPI payment type to upi mode", () => {
    const result = mapSaleRowToInsertParams(saleRow, "2026-07-10", "2026-08-09");
    expect(result.paymentMode).toBe("upi");
  });

  it("keeps a non-blank invoice number as legacyInvoiceNumber (uniqueness is checked at write time, not here)", () => {
    const result = mapSaleRowToInsertParams(saleRow, "2026-07-10", "2026-08-09");
    expect(result.legacyInvoiceNumber).toBe("B&S01029/2026");
  });

  it("derives a distinct legacySaleRowKey from customer id + row index", () => {
    const result = mapSaleRowToInsertParams(saleRow, "2026-07-10", "2026-08-09");
    expect(result.legacySaleRowKey).toBe("YDL-3498045#2");
  });

  it("preserves legacy plan status, payment mode, and reference details in notes", () => {
    const result = mapSaleRowToInsertParams(saleRow, "2026-07-10", "2026-08-09");
    expect(result.notes).toContain("EX");
    expect(result.notes).toContain("UPI");
  });
});
