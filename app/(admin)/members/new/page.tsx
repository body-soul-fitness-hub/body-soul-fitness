import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getEnquiryForPrefill } from "@/app/(admin)/members/actions";
import type { Enquiry } from "@/lib/enquiries/types";
import { MemberForm } from "./member-form";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function NewMemberPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolved = await searchParams;
  const enquiryIdParam = resolved.enquiryId;
  const enquiryId = Array.isArray(enquiryIdParam) ? enquiryIdParam[0] : enquiryIdParam;

  let enquiry: Enquiry | null = null;
  if (enquiryId) {
    enquiry = await getEnquiryForPrefill(enquiryId);
  }

  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex items-center gap-3">
        <Link className="grid size-10 place-items-center rounded-xl border border-[#e5e9e5] bg-white" href={enquiry ? `/enquiries/${enquiry.id}` : "/members"}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">{enquiry ? "Convert to member" : "New member"}</p>
          <h1 className="font-display mt-1 text-2xl font-black tracking-[-0.05em] sm:text-3xl">
            {enquiry ? `Register ${enquiry.full_name} as a member` : "Member registration"}
          </h1>
          {enquiry && <p className="mt-2 text-sm font-medium text-[#6c7773]">Prefilled from their enquiry — review and adjust before saving.</p>}
        </div>
      </div>

      <MemberForm enquiry={enquiry} />
    </div>
  );
}
