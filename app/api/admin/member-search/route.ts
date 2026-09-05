import { requireSuperAdmin } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  await requireSuperAdmin();
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return Response.json({ members: [] });

  const escaped = query.replace(/[%_,]/g, (match) => `\\${match}`);
  const { data, error } = await supabaseAdmin
    .from("members")
    .select("id,member_id,full_name,mobile_number,status")
    .or(`full_name.ilike.%${escaped}%,mobile_number.ilike.%${escaped}%,member_id.ilike.%${escaped}%`)
    .order("full_name")
    .limit(8);

  if (error) return Response.json({ error: "Could not find members." }, { status: 500 });
  return Response.json({ members: data ?? [] });
}
