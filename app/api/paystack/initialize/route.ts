import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_AMOUNTS_KOBO, PLAN_TIER, LEADS_ADDON_KOBO, isPlanId } from "@/lib/plans";

export async function POST(request: NextRequest) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Paystack is not configured on the server." },
      { status: 500 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const {
    plan,
    leadsAddon,
    shopName,
    description,
    category,
    firstName,
    middleName,
    lastName,
    phone,
    dob,
    gender,
    accountName,
  } = await request.json();

  if (!isPlanId(plan)) {
    return NextResponse.json({ error: "Choose a valid plan." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existingShop } = await admin
    .from("shops")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();

  const isRenewal = Boolean(existingShop);

  if (isRenewal) {
    // Renewal — no new-shop details needed, just block downgrades.
    if (PLAN_TIER[plan] < PLAN_TIER[existingShop!.plan as keyof typeof PLAN_TIER]) {
      return NextResponse.json(
        {
          error:
            "You can't select a lower plan than your current plan. Choose the same plan or higher to renew.",
        },
        { status: 400 }
      );
    }
  } else {
    // New shop — require onboarding details and re-check availability.
    if (!shopName || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required shop details." },
        { status: 400 }
      );
    }

    const { data: existingName } = await admin
      .from("shops")
      .select("id")
      .eq("shop_name_normalized", String(shopName).toLowerCase())
      .maybeSingle();

    if (existingName) {
      return NextResponse.json(
        { error: "That store name was just taken. Choose another." },
        { status: 409 }
      );
    }

    const { data: existingPhone } = await admin
      .from("shops")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existingPhone) {
      return NextResponse.json(
        { error: "That phone number is already linked to another shop." },
        { status: 409 }
      );
    }
  }

  const amount = PLAN_AMOUNTS_KOBO[plan] + (leadsAddon ? LEADS_ADDON_KOBO : 0);
  const callbackUrl = `${request.nextUrl.origin}/dashboard/open-shop/callback`;

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      amount,
      callback_url: callbackUrl,
      metadata: {
        user_id: user.id,
        plan,
        leads_addon: Boolean(leadsAddon),
        is_renewal: isRenewal,
        shop_name: shopName,
        description,
        category,
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        phone,
        dob,
        gender,
        account_name: accountName,
      },
    }),
  });

  const json = await res.json();

  if (!json.status) {
    return NextResponse.json(
      { error: json.message || "Could not start payment." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    authorizationUrl: json.data.authorization_url as string,
    reference: json.data.reference as string,
  });
}
