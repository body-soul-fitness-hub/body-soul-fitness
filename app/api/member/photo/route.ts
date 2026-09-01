import { supabaseAdmin } from "@/lib/supabase/server";
import { getMemberPhotoUrl } from "@/lib/members/photo";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !auth.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data: member } = await supabaseAdmin.from("members").select("photo_path").eq("auth_user_id", auth.user.id).maybeSingle();
  if (!member) return Response.json({ error: "Member profile not found" }, { status: 404 });
  const url = await getMemberPhotoUrl(member.photo_path);
  return Response.json({ url });
}
