import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PLAN_DURATION_DAYS: Record<string, number> = {
  daily: 1,
  monthly: 30,
  yearly: 365,
};

export async function GET(request: NextRequest) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Paystack is not configured on the server." },
      { status: 500 }
    );
  }

  const reference = request.nextUrl.searchParams.get("reference");
  if (!reference) {
    return NextResponse.json(
      { error: "Missing payment reference." },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey}` }, cache: "no-store" }
  );
  const verifyJson = await verifyRes.json();

  if (!verifyJson.status || verifyJson.data.status !== "success") {
    return NextResponse.json(
      { error: "Payment was not successful." },
      { status: 400 }
    );
  }

  const metadata = verifyJson.data.metadata || {};

  if (metadata.user_id !== user.id) {
    return NextResponse.json(
      { error: "This payment does not belong to your account." },
      { status: 403 }
    );
  }

  const plan = metadata.plan as string;
  const days = PLAN_DURATION_DAYS[plan] ?? 30;
  const expiresAt = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000
  ).toISOString();

  // Written with the service-role client, not the user's own session —
  // has_shop and the active plan must not be writable by the client SDK,
  // or a seller could just flip the flag on themselves without paying.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      has_shop: true,
      shop_plan: plan,
      shop_plan_expires_at: expiresAt,
      kyc_verified_name: metadata.verified_name,
      kyc_status: "verified",
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, plan, expiresAt });
}
