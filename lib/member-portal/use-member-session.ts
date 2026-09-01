"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

// The member portal's browser session has no server-side cookie (see lib/supabase/client.ts),
// so every portal page self-guards client-side the same way app/member/dashboard already did.
export function useMemberSession(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) {
        window.location.assign("/member/login");
        return;
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return ready;
}
