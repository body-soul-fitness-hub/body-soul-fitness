import Link from "next/link";
import { ArrowLeft, UploadCloud } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ImportForm } from "./import-form";

type BatchRow = {
  id: string;
  source_customer_file: string;
  source_sales_file: string;
  source_customer_rows: number;
  source_sales_rows: number;
  status: string;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
};

export default async function LegacyImportPage() {
  const { data } = await supabaseAdmin
    .from("legacy_import_batches")
    .select("id, source_customer_file, source_sales_file, source_customer_rows, source_sales_rows, status, created_by, created_at, completed_at")
    .order("created_at", { ascending: false })
    .limit(20);
  const batches = (data ?? []) as BatchRow[];

  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm font-bold text-[#577c25]"><ArrowLeft size={16} /> Settings</Link>
      <div className="mt-5 flex items-center gap-2 text-[#699238]">
        <UploadCloud size={24} />
      </div>
      <h1 className="font-display mt-2 text-3xl font-black tracking-[-0.055em]">Legacy import</h1>
      <p className="mt-2 max-w-2xl text-sm font-medium text-[#6c7773]">
        Import historical members and sales from the old GymMaster export. Upload both workbooks, review the dry-run summary, then confirm to write the data.
        No WhatsApp messages, login codes, or QR passes are ever sent during import — imported members show as expired until a staff member verifies and creates a current subscription.
      </p>

      <ImportForm />

      <div className="mt-8">
        <h2 className="text-sm font-extrabold text-[#0f1816]">Past import batches</h2>
        {batches.length === 0 ? (
          <p className="mt-2 text-sm font-medium text-[#89938f]">No imports have been run yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-[#e5e9e5] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#f5f7f4] text-xs font-extrabold uppercase tracking-wide text-[#89938f]">
                <tr>
                  <th className="px-4 py-3 text-left">Files</th>
                  <th className="px-4 py-3 text-left">Rows</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">By</th>
                  <th className="px-4 py-3 text-left">Started</th>
                  <th className="px-4 py-3 text-left" />
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id} className="border-t border-[#eef1ee]">
                    <td className="px-4 py-3 font-medium text-[#3a4542]">{batch.source_customer_file} + {batch.source_sales_file}</td>
                    <td className="px-4 py-3 text-[#6c7773]">{batch.source_customer_rows} / {batch.source_sales_rows}</td>
                    <td className="px-4 py-3"><StatusBadge status={batch.status} /></td>
                    <td className="px-4 py-3 text-[#6c7773]">{batch.created_by ?? "—"}</td>
                    <td className="px-4 py-3 text-[#6c7773]">{new Date(batch.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right"><Link href={`/settings/legacy-import/${batch.id}`} className="text-xs font-extrabold text-[#577c25]">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    prepared: "bg-[#f5f7f4] text-[#6c7773]",
    validated: "bg-[#fef7e6] text-[#8a5a12]",
    imported: "bg-[#eaf3e0] text-[#3f6212]",
    failed: "bg-[#fff0f1] text-[#a83848]",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${styles[status] ?? "bg-[#f5f7f4] text-[#6c7773]"}`}>{status}</span>;
}
