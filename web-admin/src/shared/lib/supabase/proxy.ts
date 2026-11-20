import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig, isSupabaseConfigured } from "@/shared/config/runtime";

export function hasAdminClaim(claims: Record<string, unknown> | null | undefined): boolean {
  if (!claims || typeof claims !== "object") {
    return false;
  }

  const appMetadata = claims.app_metadata;
  if (!appMetadata || typeof appMetadata !== "object") {
    return false;
  }

  const meta = appMetadata as Record<string, unknown>;
  if (typeof meta.role === "string") {
    const normalizedRole = meta.role.trim().toLowerCase();
    if (normalizedRole === "admin" || normalizedRole === "moderator") {
      return true;
    }
  }

  if (Array.isArray(meta.permissions)) {
    return meta.permissions.some((permission) => {
      if (typeof permission !== "string") {
        return false;
      }
      const normalized = permission.trim().toLowerCase();
      return normalized === "community.moderate" || normalized === "wf02.moderate";
    });
  }

  return false;
}

function copySessionState(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  for (const headerName of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(headerName);
    if (value) target.headers.set(headerName, value);
  }
  return target;
}

export async function updateSession(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isLoginRoute = request.nextUrl.pathname === "/login";

  if (!isSupabaseConfigured()) {
    if (isAdminRoute) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("reason", "configuration");
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabasePublicConfig();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headersToSet).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub) && !error;
  const isAdmin = isAuthenticated && hasAdminClaim(data?.claims as Record<string, unknown> | undefined);

  if (isAdminRoute && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return copySessionState(response, NextResponse.redirect(loginUrl));
  }

  if (isAdminRoute && !isAdmin) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("reason", "forbidden");
    return copySessionState(response, NextResponse.redirect(loginUrl));
  }

  if (isLoginRoute && isAdmin) {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = "/admin";
    adminUrl.search = "";
    return copySessionState(response, NextResponse.redirect(adminUrl));
  }

  return response;
}
