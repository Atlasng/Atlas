import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PLAN_AMOUNTS_KOBO: Record<string, number> = {
  starter: 250000, // ₦2,500
  business: 500000, // ₦5,000
  professional: 1000000, // ₦10,000
};

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

  const amount = PLAN_AMOUNTS_KOBO[plan];
  if (!amount) {
    return NextResponse.json({ error: "Choose a valid plan." }, { status: 400 });
  }
  if (!shopName || !firstName || !lastName) {
    return NextResponse.json(
      { error: "Missing required shop details." },
      { status: 400 }
    );
  }

  // Defensive re-check — the name or phone could have been taken by
  // someone else between when this seller checked it and when they hit Pay now.
  const admin = createAdminClient();
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
