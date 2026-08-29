import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

const BUCKET = "member-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 10;

export async function uploadMemberPhoto(file: File): Promise<string> {
  const extension = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  const path = `${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;

  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    throw new Error(`Could not upload photo: ${error.message}`);
  }

  return path;
}

export async function deleteMemberPhoto(path: string): Promise<void> {
  await supabaseAdmin.storage.from(BUCKET).remove([path]);
}

export async function getMemberPhotoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}
