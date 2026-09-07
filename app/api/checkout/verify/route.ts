import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    return NextResponse.json({ error: "Missing payment reference." }, { status: 400 });
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
    return NextResponse.json({ error: "Payment was not successful." }, { status: 400 });
  }

  const metadata = verifyJson.data.metadata || {};
  if (metadata.buyer_id !== user.id) {
    return NextResponse.json(
      { error: "This payment does not belong to your account." },
      { status: 403 }
    );
  }

  const admin = createAdminClient();

  const { error: updateError } = await admin
    .from("orders")
    .update({ status: "paid" })
    .eq("id", metadata.order_id)
    .eq("buyer_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Cart is cleared only now, after payment is confirmed — not at
  // checkout-initialize time, in case the payment never completes.
  await admin.from("cart_items").delete().eq("user_id", user.id);

  return NextResponse.json({ success: true, orderId: metadata.order_id });
}
