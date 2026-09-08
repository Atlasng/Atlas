import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
import { hasCompleteDeliveryPricing, type DeliveryPrices } from "@/lib/nigerian-states";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/dashboard/shop")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!user && request.nextUrl.pathname.startsWith("/dashboard/open-shop")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Enforced here, server-side, so it can never be skipped by a page that
  // forgets its own check, disabled JS, or a direct request to the route —
  // this is the one place that actually gates every /dashboard/shop/* page.
  if (user && request.nextUrl.pathname.startsWith("/dashboard/shop")) {
    const { data: shop } = await supabase
      .from("shops")
      .select("plan_expires_at, delivery_prices")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!shop) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/open-shop";
      return NextResponse.redirect(url);
    }

    if (new Date(shop.plan_expires_at) < new Date()) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/plans";
      return NextResponse.redirect(url);
    }

    // Product listing (new or edit) requires complete delivery pricing —
    // don't let a seller publish something buyers can't actually check out
    // because there's no delivery price for their state. The settings page
    // itself is exempt, obviously, or nobody could ever fix this.
    const isListingRoute =
      request.nextUrl.pathname.startsWith("/dashboard/shop/new") ||
      /^\/dashboard\/shop\/products\/[^/]+\/edit/.test(request.nextUrl.pathname);

    if (
      isListingRoute &&
      !hasCompleteDeliveryPricing(shop.delivery_prices as DeliveryPrices | null)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/shop/settings";
      url.searchParams.set("reason", "delivery-required");
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/shop/:path*", "/dashboard/open-shop", "/dashboard/open-shop/:path*"],
};
