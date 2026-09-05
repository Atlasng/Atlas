import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PLAN_AMOUNTS_KOBO: Record<string, number> = {
  daily: 300000, // ₦3,000
  monthly: 4000000, // ₦40,000
  yearly: 45000000, // ₦450,000
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

  const { plan, verifiedName, accountName } = await request.json();
  const amount = PLAN_AMOUNTS_KOBO[plan];

  if (!amount) {
    return NextResponse.json({ error: "Choose a valid plan." }, { status: 400 });
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
        verified_name: verifiedName,
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
