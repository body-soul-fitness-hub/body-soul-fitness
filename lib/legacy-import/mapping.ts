import { round2 } from "@/lib/plans/types";
import type { PaymentMode, PaymentStatus } from "@/lib/subscriptions/types";
import { computeLegacySaleRowKey, mapPaymentMode, mapPaymentStatus, normalizeLegacyDate, normalizeName, normalizeToE164 } from "./normalize";
import type { LegacyCustomerRow, LegacySaleRow } from "./types";

export type MemberInsert = {
  legacy_customer_code: string;
  legacy_import_batch_id: string;
  full_name: string;
  mobile_number: string;
  whatsapp_number: string | null;
  email: string | null;
  gender: string | null;
  date_of_birth: string | null;
  emergency_contact_number: string | null;
  address: string | null;
  assigned_trainer: string | null;
  assigned_staff: string | null;
  join_date: string;
  legacy_metadata: Record<string, unknown>;
};

// join_date has a NOT NULL constraint — a row with no parseable Conversion Date is excluded from
// the write pass entirely (flagged in validate.ts) rather than defaulting to "today", which would
// misrepresent when the person actually joined.
export function mapCustomerRowToMemberInsert(row: LegacyCustomerRow, batchId: string, joinDate: string): MemberInsert {
  const normalizedPhone = normalizeToE164(row.number) ?? row.number;
  return {
    legacy_customer_code: row.code,
    legacy_import_batch_id: batchId,
    full_name: normalizeName(row.name),
    mobile_number: normalizedPhone,
    whatsapp_number: row.whatsappNumbers ? normalizeToE164(row.whatsappNumbers) : null,
    email: row.email.trim() || null,
    gender: row.gender.trim() ? row.gender.trim().toLowerCase() : null,
    date_of_birth: normalizeLegacyDate(row.dob),
    emergency_contact_number: row.emergencyContactNo ? normalizeToE164(row.emergencyContactNo) : null,
    address: row.address.trim() || null,
    assigned_trainer: row.assignedTrainer.trim() || null,
    assigned_staff: row.handledBy.trim() || null,
    join_date: joinDate,
    legacy_metadata: {
      source: row.sourceOfPromo.trim() || null,
      employment_type: row.employmentType.trim() || null,
      lead_type: row.leadType.trim() || null,
      app_installed: row.appInstalled.trim() || null,
      legacy_status: row.membershipStatus.trim() || null,
      date_of_enquiry: normalizeLegacyDate(row.dateOfEnquiry),
      reference_no: row.referenceNo.trim() || null,
      legacy_notes: row.notes.trim() || null,
    },
  };
}

export type SaleRowParams = {
  legacySaleRowKey: string;
  planName: string;
  startDate: string;
  endDate: string;
  standardPrice: number;
  finalAmount: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode | null;
  legacyPlanStatus: string | null;
  legacyInvoiceNumber: string | null;
  notes: string;
};

export function mapSaleRowToInsertParams(row: LegacySaleRow, startDateIso: string, endDateIso: string): SaleRowParams {
  const { status: paymentStatus, warning: paymentStatusWarning } = mapPaymentStatus(row.paymentStatus, row.totalSaleAmount, row.paidAmount);
  const paymentMode = mapPaymentMode(row.paymentType);

  const noteParts = [
    `Imported from legacy GymMaster sale row (invoice "${row.invoiceNo || "—"}").`,
    `Legacy payment mode: "${row.paymentType.trim() || "—"}".`,
    `Legacy payment status: "${row.paymentStatus.trim() || "—"}".`,
    `Legacy plan status: "${row.planStatus.trim() || "—"}".`,
  ];
  if (row.sourceOfPromotion.trim()) noteParts.push(`Source: "${row.sourceOfPromotion.trim()}".`);
  if (row.trainerName.trim()) noteParts.push(`Trainer: "${row.trainerName.trim()}".`);
  if (row.staffName.trim()) noteParts.push(`Staff: "${row.staffName.trim()}".`);
  if (row.referenceNumber.trim()) noteParts.push(`Legacy reference #: "${row.referenceNumber.trim()}".`);
  if (row.note.trim()) noteParts.push(`Legacy note: "${row.note.trim()}".`);
  if (paymentStatusWarning) noteParts.push(paymentStatusWarning);

  return {
    legacySaleRowKey: computeLegacySaleRowKey(row.customerId, row.rowIndex),
    planName: row.planName.trim(),
    startDate: startDateIso,
    endDate: endDateIso,
    standardPrice: round2(row.netSaleAmount),
    finalAmount: round2(row.totalSaleAmount),
    amountPaid: round2(row.paidAmount),
    paymentStatus,
    paymentMode,
    legacyPlanStatus: row.planStatus.trim() || null,
    legacyInvoiceNumber: row.invoiceNo.trim() || null,
    notes: noteParts.join(" "),
  };
}
