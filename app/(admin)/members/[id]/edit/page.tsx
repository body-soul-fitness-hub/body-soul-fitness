import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getMemberPhotoUrl } from "@/lib/members/photo";
import type { Member } from "@/lib/members/types";
import { MemberEditForm } from "../edit-form";

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: member, error } = await supabaseAdmin.from("members").select("*").eq("id", id).maybeSingle();

  if (error || !member) {
    notFound();
  }

  const record = member as Member;
  const photoUrl = await getMemberPhotoUrl(record.photo_path);

  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex items-center gap-3">
        <Link className="grid size-10 place-items-center rounded-xl border border-[#e5e9e5] bg-white" href={`/members/${record.id}`}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">{record.member_id}</p>
          <h1 className="font-display mt-1 text-2xl font-black tracking-[-0.05em] sm:text-3xl">Edit {record.full_name}</h1>
        </div>
      </div>

      <MemberEditForm member={record} photoUrl={photoUrl} />
    </div>
  );
}
