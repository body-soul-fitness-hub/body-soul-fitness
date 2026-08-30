import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const protectedPaths = ["/", "/members", "/enquiries", "/plans", "/subscriptions", "/payments", "/attendance", "/reports", "/notifications", "/settings"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPage = protectedPaths.some((path) => path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`));
  if (!protectedPage) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => { cookies.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/admin/login", request.url));

  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: staff } = await service.from("staff_users").select("id").eq("auth_user_id", user.id).eq("role", "administrator").eq("is_active", true).maybeSingle();
  if (!staff) { await supabase.auth.signOut(); return NextResponse.redirect(new URL("/admin/login", request.url)); }
  return response;
}

export const config = { matcher: ["/", "/members/:path*", "/enquiries/:path*", "/plans/:path*", "/subscriptions/:path*", "/payments/:path*", "/attendance/:path*", "/reports/:path*", "/notifications/:path*", "/settings/:path*"] };
