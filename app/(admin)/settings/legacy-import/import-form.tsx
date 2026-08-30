"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

type ValidationIssue = { level: "error" | "warning"; code: string; message: string; rowIndex?: number; legacyCode?: string };

type ImportSummary = {
  customerRows: number;
  salesRows: number;
  joinedRows: number;
  customersWithoutSales: number;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  parseErrors: string[];
};

type DryRunResponse = { batchId: string; status: "validated" | "failed"; summary: ImportSummary };

type CommitSummary = ImportSummary & {
  membersCreated: number;
  membersSkippedExisting: number;
  membersSkippedInvalid: number;
  subscriptionsCreated: number;
  subscriptionsSkippedExisting: number;
  subscriptionsSkippedInvalid: number;
  invoicesCreated: number;
  paymentsCreated: number;
};

export function ImportForm() {
  const router = useRouter();
  const [dryRun, setDryRun] = useState<DryRunResponse | null>(null);
  const [commitSummary, setCommitSummary] = useState<CommitSummary | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleDryRun(formData: FormData) {
    setPending(true);
    setError("");
    setCommitSummary(null);
    try {
      const response = await fetch("/api/admin/legacy-import/dry-run", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok && !data.summary) {
        setError(data.error ?? "Dry run failed.");
        setDryRun(null);
      } else {
        setDryRun(data as DryRunResponse);
      }
    } catch {
      setError("Dry run failed. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleConfirm() {
    if (!dryRun) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/legacy-import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: dryRun.batchId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Import failed.");
      } else {
        setCommitSummary(data.summary as CommitSummary);
        router.refresh();
      }
    } catch {
      setError("Import failed. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6 rounded-3xl border border-[#e5e9e5] bg-white p-6">
      <form
        action={(formData) => handleDryRun(formData)}
        className="grid gap-4 sm:grid-cols-2"
      >
        <label className="block text-xs font-extrabold">
          Customers workbook (.xlsx)
          <input required name="customers_file" type="file" accept=".xlsx" className="mt-1.5 block w-full rounded-xl border border-[#e5e9e5] px-3 py-2.5 text-sm font-medium" />
        </label>
        <label className="block text-xs font-extrabold">
          Sales workbook (.xlsx)
          <input required name="sales_file" type="file" accept=".xlsx" className="mt-1.5 block w-full rounded-xl border border-[#e5e9e5] px-3 py-2.5 text-sm font-medium" />
        </label>
        <div className="sm:col-span-2">
          <button disabled={pending} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#111c19] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60">
            {pending && !dryRun ? <Loader2 size={16} className="animate-spin" /> : null} Run dry run
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-[#fff0f1] p-3 text-sm font-bold text-[#a83848]">
          <AlertTriangle size={16} /> {error}
        </p>
      )}

      {dryRun && !commitSummary && (
        <div className="mt-6 border-t border-[#eef1ee] pt-5">
          <SummaryView summary={dryRun.summary} title={dryRun.status === "failed" ? "Dry run failed" : "Dry run summary"} />
          {dryRun.status === "validated" && (
            <button
              disabled={pending}
              onClick={handleConfirm}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#699238] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60"
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Confirm & import
            </button>
          )}
        </div>
      )}

      {commitSummary && (
        <div className="mt-6 border-t border-[#eef1ee] pt-5">
          <p className="flex items-center gap-2 text-sm font-extrabold text-[#3f6212]"><CheckCircle2 size={16} /> Import complete</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Members created" value={commitSummary.membersCreated} />
            <Stat label="Members skipped (existing)" value={commitSummary.membersSkippedExisting} />
            <Stat label="Members skipped (invalid)" value={commitSummary.membersSkippedInvalid} />
            <Stat label="Subscriptions created" value={commitSummary.subscriptionsCreated} />
            <Stat label="Subscriptions skipped (existing)" value={commitSummary.subscriptionsSkippedExisting} />
            <Stat label="Subscriptions skipped (invalid)" value={commitSummary.subscriptionsSkippedInvalid} />
            <Stat label="Invoices created" value={commitSummary.invoicesCreated} />
            <Stat label="Payments created" value={commitSummary.paymentsCreated} />
          </dl>
          <SummaryView summary={commitSummary} title="" />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[#f5f7f4] p-3">
      <p className="text-lg font-black text-[#0f1816]">{value}</p>
      <p className="text-xs font-medium text-[#89938f]">{label}</p>
    </div>
  );
}

function SummaryView({ summary, title }: { summary: ImportSummary; title: string }) {
  return (
    <div>
      {title && <p className="text-sm font-extrabold text-[#0f1816]">{title}</p>}
      {summary.parseErrors.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-medium text-[#a83848]">
          {summary.parseErrors.map((message, i) => <li key={i}>{message}</li>)}
        </ul>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Customer rows" value={summary.customerRows} />
        <Stat label="Sales rows" value={summary.salesRows} />
        <Stat label="Customers with sales" value={summary.joinedRows} />
        <Stat label="Customers without sales" value={summary.customersWithoutSales} />
      </dl>
      {summary.errors.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#a83848]">Errors — these rows will be skipped ({summary.errors.length})</p>
          <IssueList issues={summary.errors} />
        </div>
      )}
      {summary.warnings.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#8a5a12]">Warnings — for your review, not blocking ({summary.warnings.length})</p>
          <IssueList issues={summary.warnings} />
        </div>
      )}
    </div>
  );
}

function IssueList({ issues }: { issues: ValidationIssue[] }) {
  const visible = issues.slice(0, 50);
  return (
    <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-xl bg-[#f5f7f4] p-3 text-xs font-medium text-[#3a4542]">
      {visible.map((issue, i) => (
        <li key={i}>
          {issue.rowIndex ? `Row ${issue.rowIndex}: ` : ""}
          {issue.message}
        </li>
      ))}
      {issues.length > visible.length && <li className="font-extrabold text-[#89938f]">…and {issues.length - visible.length} more.</li>}
    </ul>
  );
}
