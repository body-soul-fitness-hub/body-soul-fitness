import { normalizeLegacyDate, normalizeToE164 } from "./normalize";
import type { ExistingMemberLookup, ImportSummary, LegacyCustomerRow, LegacySaleRow, ValidationIssue } from "./types";

export function validateImport(
  customers: LegacyCustomerRow[],
  sales: LegacySaleRow[],
  existing: ExistingMemberLookup
): ImportSummary {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const blockedCustomerRowIndexes = new Set<number>();
  const blockedSaleRowIndexes = new Set<number>();

  // 1. Duplicate legacy customer codes within the uploaded file.
  const codeSeen = new Map<string, number[]>();
  for (const row of customers) {
    if (!row.code) {
      errors.push({ level: "error", code: "missing_customer_code", message: "Customer row has no Code.", rowIndex: row.rowIndex });
      blockedCustomerRowIndexes.add(row.rowIndex);
      continue;
    }
    codeSeen.set(row.code, [...(codeSeen.get(row.code) ?? []), row.rowIndex]);
  }
  for (const [code, rowIndexes] of codeSeen) {
    if (rowIndexes.length > 1) {
      errors.push({
        level: "error",
        code: "duplicate_customer_code",
        message: `Customer code "${code}" appears ${rowIndexes.length} times in the uploaded file (rows ${rowIndexes.join(", ")}).`,
        legacyCode: code,
      });
      rowIndexes.forEach((i) => blockedCustomerRowIndexes.add(i));
    }
  }

  // 2. Per-customer-row checks: phone format, conversion date, member mismatch.
  for (const row of customers) {
    if (!row.code || (codeSeen.get(row.code)?.length ?? 0) > 1) continue;
    if (!row.name.trim()) {
      errors.push({ level: "error", code: "missing_name", message: "Customer row has no Name.", rowIndex: row.rowIndex, legacyCode: row.code });
      blockedCustomerRowIndexes.add(row.rowIndex);
    }
    if (!/^\d{10}$/.test(row.number.trim())) {
      errors.push({ level: "error", code: "invalid_phone", message: `Customer "${row.code}" has an unrecognized phone number format: "${row.number}".`, rowIndex: row.rowIndex, legacyCode: row.code });
      blockedCustomerRowIndexes.add(row.rowIndex);
      continue;
    }
    if (!normalizeLegacyDate(row.conversionDate)) {
      errors.push({ level: "error", code: "invalid_conversion_date", message: `Customer "${row.code}" has an unparseable Conversion Date: "${row.conversionDate}".`, rowIndex: row.rowIndex, legacyCode: row.code });
      blockedCustomerRowIndexes.add(row.rowIndex);
      continue;
    }

    const normalizedPhone = normalizeToE164(row.number)!;
    const existingByPhone = existing.byNormalizedPhone.get(normalizedPhone);
    if (existingByPhone && existingByPhone.legacy_customer_code !== row.code) {
      errors.push({
        level: "error",
        code: "member_mismatch",
        message: `Customer "${row.code}" (${row.name}) shares a phone number with existing member ${existingByPhone.full_name} (mobile ${existingByPhone.mobile_number}), whose legacy code is ${existingByPhone.legacy_customer_code ?? "none"}. Not imported — resolve manually.`,
        rowIndex: row.rowIndex,
        legacyCode: row.code,
      });
      blockedCustomerRowIndexes.add(row.rowIndex);
      continue;
    }

    const existingByCode = existing.byLegacyCode.get(row.code);
    if (existingByCode && (existingByCode.full_name.trim().toLowerCase() !== row.name.trim().toLowerCase() || existingByCode.mobile_number !== normalizedPhone)) {
      warnings.push({
        level: "warning",
        code: "existing_member_details_differ",
        message: `Customer "${row.code}" was already imported as ${existingByCode.full_name} (${existingByCode.mobile_number}); this row's name/phone differs and will be skipped, not overwritten.`,
        rowIndex: row.rowIndex,
        legacyCode: row.code,
      });
    }
  }

  // 3. Sale-row checks: known customer, valid dates, no negative amounts, no end < start.
  const customerCodeSet = new Set(customers.map((c) => c.code).filter(Boolean));
  const blockedCustomerCodes = new Set(customers.filter((c) => blockedCustomerRowIndexes.has(c.rowIndex)).map((c) => c.code));
  const joinedCustomerCodes = new Set<string>();
  const compositeSeen = new Map<string, number[]>();

  for (const row of sales) {
    if (!row.customerId) {
      errors.push({ level: "error", code: "missing_sale_customer_id", message: "Sale row has no Customer ID.", rowIndex: row.rowIndex });
      blockedSaleRowIndexes.add(row.rowIndex);
      continue;
    }
    if (!customerCodeSet.has(row.customerId) || blockedCustomerCodes.has(row.customerId)) {
      errors.push({ level: "error", code: "unmatched_sale_customer", message: `Sale row's Customer ID "${row.customerId}" does not match a valid row in the customers file.`, rowIndex: row.rowIndex, legacyCode: row.customerId });
      blockedSaleRowIndexes.add(row.rowIndex);
      continue;
    }
    joinedCustomerCodes.add(row.customerId);

    const startIso = normalizeLegacyDate(row.startDate);
    const endIso = normalizeLegacyDate(row.endDate);
    if (!startIso || !endIso) {
      errors.push({ level: "error", code: "invalid_sale_dates", message: `Sale row for "${row.customerId}" has an unparseable Start/End Date ("${row.startDate}" / "${row.endDate}").`, rowIndex: row.rowIndex, legacyCode: row.customerId });
      blockedSaleRowIndexes.add(row.rowIndex);
      continue;
    }
    if (endIso < startIso) {
      errors.push({ level: "error", code: "end_before_start", message: `Sale row for "${row.customerId}" has End Date (${endIso}) before Start Date (${startIso}).`, rowIndex: row.rowIndex, legacyCode: row.customerId });
      blockedSaleRowIndexes.add(row.rowIndex);
      continue;
    }
    if (row.netSaleAmount < 0 || row.totalSaleAmount < 0 || row.paidAmount < 0) {
      errors.push({ level: "error", code: "negative_amount", message: `Sale row for "${row.customerId}" has a negative amount.`, rowIndex: row.rowIndex, legacyCode: row.customerId });
      blockedSaleRowIndexes.add(row.rowIndex);
      continue;
    }

    const compositeKey = `${row.customerId}|${row.planName.trim().toLowerCase()}|${startIso}|${endIso}`;
    compositeSeen.set(compositeKey, [...(compositeSeen.get(compositeKey) ?? []), row.rowIndex]);
  }

  for (const [, rowIndexes] of compositeSeen) {
    if (rowIndexes.length > 1) {
      warnings.push({
        level: "warning",
        code: "duplicate_sale_content",
        message: `${rowIndexes.length} sale rows share the same customer, plan, start, and end date (rows ${rowIndexes.join(", ")}) — likely a duplicate entry in the source file, but will be imported as separate rows unless you remove one before confirming.`,
      });
    }
  }

  return {
    customerRows: customers.length,
    salesRows: sales.length,
    joinedRows: joinedCustomerCodes.size,
    customersWithoutSales: customers.filter((c) => c.code && !joinedCustomerCodes.has(c.code)).length,
    errors,
    warnings,
    parseErrors: [],
    blockedCustomerRowIndexes: [...blockedCustomerRowIndexes],
    blockedSaleRowIndexes: [...blockedSaleRowIndexes],
  };
}
