import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { normalizeLegacyDate, normalizeToE164 } from "./normalize";
import { mapCustomerRowToMemberInsert, mapSaleRowToInsertParams } from "./mapping";
import { parseCustomersWorkbook, parseSalesWorkbook } from "./parse";
import { validateImport } from "./validate";
import type { CommitRowOutcome, CommitSummary, ExistingMemberLookup, ImportSummary, LegacyCustomerRow, LegacySaleRow } from "./types";

const BUCKET = "legacy-import-uploads";

type UploadedFiles = { customersFile: File; salesFile: File };

type Resultish<T> = { data: T | null; error: { message: string; code?: string } | null };

// ~1,250 sequential requests against Supabase in one run occasionally hit a transient
// connection failure (surfaces as supabase-js's own caught "TypeError: fetch failed" in
// `error.message`, not a real database error — those carry a `code` like "23505" and are never
// retried here since retrying a genuine constraint violation can't help). A short retry with
// backoff turns one flaky request into a delay instead of a spuriously failed row.
async function withRetry<T>(fn: () => PromiseLike<Resultish<T>>, attempts = 3): Promise<Resultish<T>> {
  let last: Resultish<T> = { data: null, error: { message: "withRetry: no attempts made" } };
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const result = await fn();
    if (!result.error) return result;
    const isTransient = !result.error.code && /fetch failed|network|ECONNRESET|ETIMEDOUT|socket hang up/i.test(result.error.message);
    last = result;
    if (!isTransient || attempt === attempts) return result;
    await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
  }
  return last;
}

// A plain sequential loop over ~1,250 rows (609 members + ~635 sale rows), each a network
// round-trip to Supabase, took 3–13 minutes in testing — too slow to be usable, and well past
// any serverless function's time limit if this route ever runs on Vercel rather than local dev.
// Bounded concurrency keeps memory/connection use sane while cutting wall time roughly
// proportionally to the concurrency level. Order of `results` matches `items` regardless of
// completion order, so counting/aggregation afterward stays deterministic.
async function mapWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

const IMPORT_CONCURRENCY = 12;

async function loadExistingMemberLookup(): Promise<ExistingMemberLookup> {
  const { data } = await supabaseAdmin.from("members").select("id, full_name, mobile_number, legacy_customer_code").limit(20_000);
  const byLegacyCode = new Map<string, { id: string; full_name: string; mobile_number: string }>();
  const byNormalizedPhone = new Map<string, { id: string; full_name: string; mobile_number: string; legacy_customer_code: string | null }>();
  for (const row of data ?? []) {
    // Existing rows may predate the phone-normalization rollout, so normalize at read time
    // rather than trusting mobile_number is already in canonical form.
    const normalizedPhone = normalizeToE164(row.mobile_number) ?? row.mobile_number;
    byNormalizedPhone.set(normalizedPhone, { id: row.id, full_name: row.full_name, mobile_number: normalizedPhone, legacy_customer_code: row.legacy_customer_code });
    if (row.legacy_customer_code) byLegacyCode.set(row.legacy_customer_code, { id: row.id, full_name: row.full_name, mobile_number: normalizedPhone });
  }
  return { byLegacyCode, byNormalizedPhone };
}

async function parseAndValidate(customersBuffer: Buffer, salesBuffer: Buffer): Promise<
  | { ok: true; customers: LegacyCustomerRow[]; sales: LegacySaleRow[]; summary: ImportSummary }
  | { ok: false; parseErrors: string[] }
> {
  const customersResult = parseCustomersWorkbook(customersBuffer);
  const salesResult = parseSalesWorkbook(salesBuffer);
  const parseErrors = [...customersResult.parseErrors, ...salesResult.parseErrors];
  if (parseErrors.length > 0) return { ok: false, parseErrors };

  const existing = await loadExistingMemberLookup();
  const summary = validateImport(customersResult.rows, salesResult.rows, existing);
  return { ok: true, customers: customersResult.rows, sales: salesResult.rows, summary };
}

export async function runDryRun(files: UploadedFiles, createdBy: string): Promise<{ batchId: string; status: "validated" | "failed"; summary: ImportSummary }> {
  const customersBuffer = Buffer.from(await files.customersFile.arrayBuffer());
  const salesBuffer = Buffer.from(await files.salesFile.arrayBuffer());

  const { data: batch, error: batchError } = await supabaseAdmin
    .from("legacy_import_batches")
    .insert({
      source_customer_file: files.customersFile.name,
      source_sales_file: files.salesFile.name,
      source_customer_rows: 0,
      source_sales_rows: 0,
      status: "prepared",
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (batchError || !batch) throw new Error(`Could not create the import batch: ${batchError?.message ?? "unknown error"}`);

  const batchId = batch.id as string;

  const [customersUpload, salesUpload] = await Promise.all([
    supabaseAdmin.storage.from(BUCKET).upload(`${batchId}/customers.xlsx`, customersBuffer, { contentType: files.customersFile.type || "application/octet-stream", upsert: true }),
    supabaseAdmin.storage.from(BUCKET).upload(`${batchId}/sales.xlsx`, salesBuffer, { contentType: files.salesFile.type || "application/octet-stream", upsert: true }),
  ]);
  if (customersUpload.error || salesUpload.error) {
    const message = `Could not store the uploaded files: ${customersUpload.error?.message ?? salesUpload.error?.message}`;
    await supabaseAdmin.from("legacy_import_batches").update({ status: "failed", summary: { parseErrors: [message] } }).eq("id", batchId);
    throw new Error(message);
  }

  const result = await parseAndValidate(customersBuffer, salesBuffer);
  if (!result.ok) {
    await supabaseAdmin.from("legacy_import_batches").update({ status: "failed", summary: { parseErrors: result.parseErrors } }).eq("id", batchId);
    return { batchId, status: "failed", summary: { customerRows: 0, salesRows: 0, joinedRows: 0, customersWithoutSales: 0, errors: [], warnings: [], parseErrors: result.parseErrors, blockedCustomerRowIndexes: [], blockedSaleRowIndexes: [] } };
  }

  await supabaseAdmin
    .from("legacy_import_batches")
    .update({ source_customer_rows: result.customers.length, source_sales_rows: result.sales.length, status: "validated", summary: result.summary })
    .eq("id", batchId);

  return { batchId, status: "validated", summary: result.summary };
}

export async function runConfirm(batchId: string, createdBy: string): Promise<CommitSummary> {
  const { data: batch, error: batchError } = await supabaseAdmin.from("legacy_import_batches").select("*").eq("id", batchId).maybeSingle();
  if (batchError || !batch) throw new Error("Import batch not found.");

  if (batch.status === "imported") return batch.summary as CommitSummary;
  if (batch.status !== "validated" && batch.status !== "failed") throw new Error(`Batch is in status "${batch.status}", expected "validated". Re-run the dry run first.`);

  const [customersDownload, salesDownload] = await Promise.all([
    supabaseAdmin.storage.from(BUCKET).download(`${batchId}/customers.xlsx`),
    supabaseAdmin.storage.from(BUCKET).download(`${batchId}/sales.xlsx`),
  ]);
  if (customersDownload.error || !customersDownload.data || salesDownload.error || !salesDownload.data) {
    throw new Error("Could not re-read the uploaded workbooks from storage. Re-run the dry run.");
  }
  const customersBuffer = Buffer.from(await customersDownload.data.arrayBuffer());
  const salesBuffer = Buffer.from(await salesDownload.data.arrayBuffer());

  const result = await parseAndValidate(customersBuffer, salesBuffer);
  if (!result.ok) {
    await supabaseAdmin.from("legacy_import_batches").update({ status: "failed", summary: { parseErrors: result.parseErrors } }).eq("id", batchId);
    throw new Error(`Re-validation failed: ${result.parseErrors.join("; ")}`);
  }

  const { customers, sales, summary } = result;
  const blockedCustomerRowIndexes = new Set(summary.blockedCustomerRowIndexes);
  const blockedSaleRowIndexes = new Set(summary.blockedSaleRowIndexes);

  type MemberRowResult = { legacyCode: string; memberId: string | null; outcome: CommitRowOutcome };

  const memberResults = await mapWithConcurrency(customers, IMPORT_CONCURRENCY, async (row): Promise<MemberRowResult> => {
    if (blockedCustomerRowIndexes.has(row.rowIndex)) {
      return { legacyCode: row.code, memberId: null, outcome: { legacyCode: row.code, status: "skipped_invalid" } };
    }

    const joinDate = normalizeLegacyDate(row.conversionDate);
    if (!joinDate) {
      // Defense in depth — validate() already blocks this, so this should be unreachable.
      return { legacyCode: row.code, memberId: null, outcome: { legacyCode: row.code, status: "skipped_invalid", message: "Unparseable conversion date." } };
    }

    const payload = mapCustomerRowToMemberInsert(row, batchId, joinDate);
    const { data: inserted, error: insertError } = await withRetry<{ id: string }>(() => supabaseAdmin.from("members").insert(payload).select("id").single());

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: existingRow, error: lookupError } = await withRetry<{ id: string }>(() => supabaseAdmin.from("members").select("id").eq("legacy_customer_code", row.code).maybeSingle());
        if (existingRow) {
          return { legacyCode: row.code, memberId: existingRow.id, outcome: { legacyCode: row.code, status: "skipped_existing" } };
        }
        if (lookupError) {
          return { legacyCode: row.code, memberId: null, outcome: { legacyCode: row.code, status: "failed", message: `Insert conflicted but the existing row could not be confirmed: ${lookupError.message}` } };
        }
      }
      return { legacyCode: row.code, memberId: null, outcome: { legacyCode: row.code, status: "failed", message: insertError.message } };
    }

    return { legacyCode: row.code, memberId: inserted!.id, outcome: { legacyCode: row.code, status: "created" } };
  });

  const rowOutcomes: CommitRowOutcome[] = memberResults.map((r) => r.outcome);
  let membersCreated = 0;
  let membersSkippedExisting = 0;
  let membersSkippedInvalid = 0;
  const memberIdByLegacyCode = new Map<string, string>();
  for (const { legacyCode, memberId, outcome } of memberResults) {
    if (memberId) memberIdByLegacyCode.set(legacyCode, memberId);
    if (outcome.status === "created") membersCreated += 1;
    else if (outcome.status === "skipped_existing") membersSkippedExisting += 1;
    else membersSkippedInvalid += 1;
  }

  type SaleRowResult = { outcome: CommitRowOutcome; invoiceCreated: boolean; paymentCreated: boolean };

  const saleResults = await mapWithConcurrency(sales, IMPORT_CONCURRENCY, async (row): Promise<SaleRowResult> => {
    if (blockedSaleRowIndexes.has(row.rowIndex)) {
      return { outcome: { legacyCode: row.customerId, status: "skipped_invalid" }, invoiceCreated: false, paymentCreated: false };
    }

    const memberId = memberIdByLegacyCode.get(row.customerId);
    if (!memberId) {
      return { outcome: { legacyCode: row.customerId, status: "skipped_invalid", message: "Member row was not imported." }, invoiceCreated: false, paymentCreated: false };
    }

    const startIso = normalizeLegacyDate(row.startDate)!;
    const endIso = normalizeLegacyDate(row.endDate)!;
    const params = mapSaleRowToInsertParams(row, startIso, endIso);

    const { data: rpcResult, error: rpcError } = await withRetry<{ status: string; subscription_id?: string; invoice_id?: string; payment_id?: string }>(() =>
      supabaseAdmin.rpc("import_legacy_sale_row", {
        p_batch_id: batchId,
        p_member_id: memberId,
        p_legacy_sale_row_key: params.legacySaleRowKey,
        p_plan_name: params.planName,
        p_start_date: params.startDate,
        p_end_date: params.endDate,
        p_standard_price: params.standardPrice,
        p_final_amount: params.finalAmount,
        p_amount_paid: params.amountPaid,
        p_payment_status: params.paymentStatus,
        p_payment_mode: params.paymentMode,
        p_legacy_plan_status: params.legacyPlanStatus,
        p_legacy_invoice_number: params.legacyInvoiceNumber,
        p_notes: params.notes,
        p_created_by: createdBy,
      })
    );

    if (rpcError) {
      return { outcome: { legacySaleRowKey: params.legacySaleRowKey, status: "failed", message: rpcError.message }, invoiceCreated: false, paymentCreated: false };
    }

    const outcome = rpcResult!;
    if (outcome.status === "skipped_existing") {
      return { outcome: { legacySaleRowKey: params.legacySaleRowKey, status: "skipped_existing" }, invoiceCreated: false, paymentCreated: false };
    }

    return {
      outcome: { legacySaleRowKey: params.legacySaleRowKey, status: "created" },
      invoiceCreated: Boolean(outcome.invoice_id),
      paymentCreated: Boolean(outcome.payment_id),
    };
  });

  let subscriptionsCreated = 0;
  let subscriptionsSkippedExisting = 0;
  let subscriptionsSkippedInvalid = 0;
  let invoicesCreated = 0;
  let paymentsCreated = 0;
  for (const { outcome, invoiceCreated, paymentCreated } of saleResults) {
    rowOutcomes.push(outcome);
    if (outcome.status === "created") {
      subscriptionsCreated += 1;
      if (invoiceCreated) invoicesCreated += 1;
      if (paymentCreated) paymentsCreated += 1;
    } else if (outcome.status === "skipped_existing") {
      subscriptionsSkippedExisting += 1;
    } else {
      subscriptionsSkippedInvalid += 1;
    }
  }

  // Finalize: any member in this batch with no currently-active, unexpired subscription is
  // marked expired — this covers both lapsed-subscription customers and the customers who never
  // had a sale at all (same rule, no special case, per docs/LEGACY_IMPORT_HANDOFF.md).
  const today = new Date().toISOString().slice(0, 10);
  const { data: batchMembers } = await supabaseAdmin.from("members").select("id").eq("legacy_import_batch_id", batchId);
  const batchMemberIds = (batchMembers ?? []).map((m) => m.id as string);
  if (batchMemberIds.length > 0) {
    const { data: currentSubs } = await supabaseAdmin
      .from("member_subscriptions")
      .select("member_id")
      .in("member_id", batchMemberIds)
      .eq("status", "active")
      .or(`end_date.is.null,end_date.gte.${today}`);
    const currentMemberIds = new Set((currentSubs ?? []).map((s) => s.member_id as string));
    const expiredMemberIds = batchMemberIds.filter((id) => !currentMemberIds.has(id));
    if (expiredMemberIds.length > 0) {
      await supabaseAdmin.from("members").update({ status: "expired" }).in("id", expiredMemberIds);
    }
  }

  const commitSummary: CommitSummary = {
    ...summary,
    membersCreated,
    membersSkippedExisting,
    membersSkippedInvalid,
    subscriptionsCreated,
    subscriptionsSkippedExisting,
    subscriptionsSkippedInvalid,
    invoicesCreated,
    paymentsCreated,
    rowOutcomes,
  };

  // A row-level "failed" outcome (a real DB error, not a validation-blocked or
  // already-imported row) means this run didn't fully succeed — mark the batch "failed" so a
  // re-confirm after fixing the underlying issue can retry it, instead of permanently locking
  // in a partial result under "imported".
  const hasRealFailures = rowOutcomes.some((outcome) => outcome.status === "failed");
  const finalStatus = hasRealFailures ? "failed" : "imported";

  await supabaseAdmin
    .from("legacy_import_batches")
    .update({ status: finalStatus, summary: commitSummary, completed_at: finalStatus === "imported" ? new Date().toISOString() : null })
    .eq("id", batchId);

  return commitSummary;
}
