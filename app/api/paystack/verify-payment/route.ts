import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_DURATION_DAYS, PLAN_TIER, isPlanId } from "@/lib/plans";

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

  // This is the actual transaction verification: an independent server-side
  // call to Paystack, confirming the payment really succeeded. Nothing
  // downstream trusts the browser's word for this.
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

  const plan = metadata.plan;
  if (!isPlanId(plan)) {
    return NextResponse.json({ error: "Invalid plan on this payment." }, { status: 400 });
  }

  const days = PLAN_DURATION_DAYS[plan];
  const expiresAt = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000
  ).toISOString();

  // Written with the service-role client, not the user's own session — a
  // shop must not be creatable or renewable by the client SDK directly, or
  // a seller could just do this for themselves without ever paying.
  const admin = createAdminClient();
  const { data: existingShop } = await admin
    .from("shops")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingShop) {
    // Renewal — final server-side downgrade guard (initialize already
    // blocked this, but never trust a client-supplied metadata value alone).
    if (PLAN_TIER[plan] < PLAN_TIER[existingShop.plan as keyof typeof PLAN_TIER]) {
      return NextResponse.json(
        { error: "This payment is for a lower plan than your current one." },
        { status: 400 }
      );
    }

    // Only the plan-related fields are touched. Store name, description,
    // category, identity details, and — once it exists — every product
    // listing tied to this shop are left completely untouched.
    const { error } = await admin
      .from("shops")
      .update({
        plan,
        plan_expires_at: expiresAt,
        leads_addon: Boolean(metadata.leads_addon),
      })
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan, expiresAt, renewed: true });
  }

  // New shop — first-time creation.
  const { error } = await admin.from("shops").insert({
    user_id: user.id,
    shop_name: metadata.shop_name,
    description: metadata.description || null,
    category: metadata.category || null,
    first_name: metadata.first_name,
    middle_name: metadata.middle_name || null,
    last_name: metadata.last_name,
    phone: metadata.phone || null,
    date_of_birth: metadata.dob || null,
    gender: metadata.gender || null,
    account_name: metadata.account_name || null,
    plan,
    plan_expires_at: expiresAt,
    leads_addon: Boolean(metadata.leads_addon),
  });

  if (error) {
    // Unique violation on the shop name or phone — extremely unlikely
    // (already re-checked at initialize time) but possible if two people
    // paid for the same name/phone within seconds of each other.
    if (error.code === "23505") {
      return NextResponse.json(
        {
          error:
            "Your payment succeeded, but that store name or phone number was just taken by someone else. Contact support to finish setting up your shop.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, plan, expiresAt, renewed: false });
}
