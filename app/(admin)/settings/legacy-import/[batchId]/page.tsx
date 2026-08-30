import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";

type ValidationIssue = { level: "error" | "warning"; code: string; message: string; rowIndex?: number; legacyCode?: string };

type StoredSummary = {
  customerRows?: number;
  salesRows?: number;
  joinedRows?: number;
  customersWithoutSales?: number;
  errors?: ValidationIssue[];
  warnings?: ValidationIssue[];
  parseErrors?: string[];
  membersCreated?: number;
  membersSkippedExisting?: number;
  membersSkippedInvalid?: number;
  subscriptionsCreated?: number;
  subscriptionsSkippedExisting?: number;
  subscriptionsSkippedInvalid?: number;
  invoicesCreated?: number;
  paymentsCreated?: number;
};

export default async function LegacyImportBatchPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const { data: batch } = await supabaseAdmin.from("legacy_import_batches").select("*").eq("id", batchId).maybeSingle();
  if (!batch) notFound();

  const summary = (batch.summary ?? {}) as StoredSummary;
  const errors = summary.errors ?? [];
  const warnings = summary.warnings ?? [];

  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <Link href="/settings/legacy-import" className="inline-flex items-center gap-1 text-sm font-bold text-[#577c25]"><ArrowLeft size={16} /> Legacy import</Link>
      <h1 className="font-display mt-3 text-3xl font-black tracking-[-0.055em]">Import batch</h1>
      <p className="mt-2 text-sm font-medium text-[#6c7773]">
        {batch.source_customer_file} + {batch.source_sales_file} · status <strong>{batch.status}</strong> · started by {batch.created_by ?? "—"} on {new Date(batch.created_at).toLocaleString()}
        {batch.completed_at ? ` · completed ${new Date(batch.completed_at).toLocaleString()}` : ""}
      </p>

      {(errors.length > 0 || warnings.length > 0) && (
        <a href={`/settings/legacy-import/${batchId}/errors`} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#e5e9e5] bg-white px-4 py-2.5 text-sm font-extrabold text-[#0f1816]">
          <Download size={16} /> Download validation report (CSV)
        </a>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Customer rows" value={summary.customerRows} />
        <Stat label="Sales rows" value={summary.salesRows} />
        <Stat label="Customers with sales" value={summary.joinedRows} />
        <Stat label="Customers without sales" value={summary.customersWithoutSales} />
        {summary.membersCreated !== undefined && (
          <>
            <Stat label="Members created" value={summary.membersCreated} />
            <Stat label="Members skipped (existing)" value={summary.membersSkippedExisting} />
            <Stat label="Members skipped (invalid)" value={summary.membersSkippedInvalid} />
            <Stat label="Subscriptions created" value={summary.subscriptionsCreated} />
            <Stat label="Subscriptions skipped (existing)" value={summary.subscriptionsSkippedExisting} />
            <Stat label="Subscriptions skipped (invalid)" value={summary.subscriptionsSkippedInvalid} />
            <Stat label="Invoices created" value={summary.invoicesCreated} />
            <Stat label="Payments created" value={summary.paymentsCreated} />
          </>
        )}
      </div>

      {errors.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-extrabold text-[#a83848]">Errors ({errors.length})</h2>
          <IssueTable issues={errors} />
        </div>
      )}
      {warnings.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-extrabold text-[#8a5a12]">Warnings ({warnings.length})</h2>
          <IssueTable issues={warnings} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-2xl border border-[#e5e9e5] bg-white p-4">
      <p className="text-xl font-black text-[#0f1816]">{value ?? "—"}</p>
      <p className="mt-1 text-xs font-medium text-[#89938f]">{label}</p>
    </div>
  );
}

function IssueTable({ issues }: { issues: ValidationIssue[] }) {
  return (
    <div className="mt-2 overflow-x-auto rounded-2xl border border-[#e5e9e5] bg-white">
      <table className="w-full text-sm">
        <thead className="bg-[#f5f7f4] text-xs font-extrabold uppercase tracking-wide text-[#89938f]">
          <tr>
            <th className="px-4 py-2.5 text-left">Row</th>
            <th className="px-4 py-2.5 text-left">Legacy code</th>
            <th className="px-4 py-2.5 text-left">Code</th>
            <th className="px-4 py-2.5 text-left">Message</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue, i) => (
            <tr key={i} className="border-t border-[#eef1ee]">
              <td className="px-4 py-2.5 text-[#6c7773]">{issue.rowIndex ?? "—"}</td>
              <td className="px-4 py-2.5 text-[#6c7773]">{issue.legacyCode ?? "—"}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-[#89938f]">{issue.code}</td>
              <td className="px-4 py-2.5 text-[#3a4542]">{issue.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
