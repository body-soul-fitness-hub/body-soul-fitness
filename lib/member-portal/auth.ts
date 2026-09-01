// This is an internal Supabase Auth identity only. Members continue to use their
// registered phone number on the app; no email is sent to this address.
export function memberPortalAuthEmail(memberRowId: string) {
  return `member-${memberRowId}@portal.bodyandsoul.invalid`;
}
