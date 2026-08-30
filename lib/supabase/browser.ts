import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Missing Supabase browser environment variables.");
}

// Unlike the member portal's local-only client, this client stores the session in
// cookies so the server can protect the dashboard on every request.
export const browserSupabase = createBrowserClient(supabaseUrl, supabasePublishableKey);
