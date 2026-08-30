import * as XLSX from "xlsx";
import { CUSTOMER_COLUMNS, SALE_COLUMNS } from "./columns";
import { toAmount } from "./normalize";
import type { LegacyCustomerRow, LegacySaleRow } from "./types";

function readRows(buffer: Buffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("The workbook has no sheets.");
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });
}

function str(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function parseCustomersWorkbook(buffer: Buffer): { rows: LegacyCustomerRow[]; parseErrors: string[] } {
  const parseErrors: string[] = [];
  let raw: Record<string, unknown>[];
  try {
    raw = readRows(buffer);
  } catch (error) {
    return { rows: [], parseErrors: [`Could not parse the customers workbook: ${error instanceof Error ? error.message : String(error)}`] };
  }

  const requiredHeaders = [CUSTOMER_COLUMNS.code, CUSTOMER_COLUMNS.name, CUSTOMER_COLUMNS.number];
  const headerKeys = raw.length > 0 ? Object.keys(raw[0]) : [];
  for (const header of requiredHeaders) {
    if (!headerKeys.includes(header)) parseErrors.push(`Customers workbook is missing expected column "${header}".`);
  }
  if (parseErrors.length > 0) return { rows: [], parseErrors };

  const rows: LegacyCustomerRow[] = raw.map((r, i) => ({
    rowIndex: i + 2, // +1 for 0-index, +1 because row 1 is the header
    code: str(r, CUSTOMER_COLUMNS.code),
    name: str(r, CUSTOMER_COLUMNS.name),
    isdCode: str(r, CUSTOMER_COLUMNS.isdCode),
    number: str(r, CUSTOMER_COLUMNS.number),
    email: str(r, CUSTOMER_COLUMNS.email),
    gender: str(r, CUSTOMER_COLUMNS.gender),
    dateOfEnquiry: str(r, CUSTOMER_COLUMNS.dateOfEnquiry),
    conversionDate: str(r, CUSTOMER_COLUMNS.conversionDate),
    handledBy: str(r, CUSTOMER_COLUMNS.handledBy),
    notes: str(r, CUSTOMER_COLUMNS.notes),
    leadType: str(r, CUSTOMER_COLUMNS.leadType),
    sourceOfPromo: str(r, CUSTOMER_COLUMNS.sourceOfPromo),
    employmentType: str(r, CUSTOMER_COLUMNS.employmentType),
    appInstalled: str(r, CUSTOMER_COLUMNS.appInstalled),
    assignedTrainer: str(r, CUSTOMER_COLUMNS.assignedTrainer),
    membershipStatus: str(r, CUSTOMER_COLUMNS.membershipStatus),
    dob: str(r, CUSTOMER_COLUMNS.dob),
    address: str(r, CUSTOMER_COLUMNS.address),
    emergencyContactNo: str(r, CUSTOMER_COLUMNS.emergencyContactNo),
    whatsappNumbers: str(r, CUSTOMER_COLUMNS.whatsappNumbers),
    referenceNo: str(r, CUSTOMER_COLUMNS.referenceNo),
  })).filter((row) => row.code || row.name || row.number);

  return { rows, parseErrors };
}

export function parseSalesWorkbook(buffer: Buffer): { rows: LegacySaleRow[]; parseErrors: string[] } {
  const parseErrors: string[] = [];
  let raw: Record<string, unknown>[];
  try {
    raw = readRows(buffer);
  } catch (error) {
    return { rows: [], parseErrors: [`Could not parse the sales workbook: ${error instanceof Error ? error.message : String(error)}`] };
  }

  const requiredHeaders = [SALE_COLUMNS.customerId, SALE_COLUMNS.planName, SALE_COLUMNS.startDate, SALE_COLUMNS.endDate];
  const headerKeys = raw.length > 0 ? Object.keys(raw[0]) : [];
  for (const header of requiredHeaders) {
    if (!headerKeys.includes(header)) parseErrors.push(`Sales workbook is missing expected column "${header}".`);
  }
  if (parseErrors.length > 0) return { rows: [], parseErrors };

  const rows: LegacySaleRow[] = raw.map((r, i) => ({
    rowIndex: i + 2,
    invoiceNo: str(r, SALE_COLUMNS.invoiceNo),
    invoiceDate: str(r, SALE_COLUMNS.invoiceDate),
    customerId: str(r, SALE_COLUMNS.customerId),
    customerName: str(r, SALE_COLUMNS.customerName),
    customerEmail: str(r, SALE_COLUMNS.customerEmail),
    customerPhone: str(r, SALE_COLUMNS.customerPhone),
    customerAlternatePhone: str(r, SALE_COLUMNS.customerAlternatePhone),
    planName: str(r, SALE_COLUMNS.planName),
    startDate: str(r, SALE_COLUMNS.startDate),
    endDate: str(r, SALE_COLUMNS.endDate),
    planStatus: str(r, SALE_COLUMNS.planStatus),
    netSaleAmount: toAmount(r[SALE_COLUMNS.netSaleAmount]),
    gst: toAmount(r[SALE_COLUMNS.gst]),
    totalSaleAmount: toAmount(r[SALE_COLUMNS.totalSaleAmount]),
    paymentStatus: str(r, SALE_COLUMNS.paymentStatus),
    trainerName: str(r, SALE_COLUMNS.trainerName),
    trainerId: str(r, SALE_COLUMNS.trainerId),
    paymentType: str(r, SALE_COLUMNS.paymentType),
    staffName: str(r, SALE_COLUMNS.staffName),
    staffId: str(r, SALE_COLUMNS.staffId),
    sourceOfPromotion: str(r, SALE_COLUMNS.sourceOfPromotion),
    paidAmount: toAmount(r[SALE_COLUMNS.paidAmount]),
    referenceNumber: str(r, SALE_COLUMNS.referenceNumber),
    note: str(r, SALE_COLUMNS.note),
  })).filter((row) => row.customerId || row.planName);

  return { rows, parseErrors };
}
