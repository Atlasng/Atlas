import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Generates a time-limited signed URL for a digital file — the only way
// a buyer can ever get the file, and only after their order is verified
// as paid. The file itself lives in a private Storage bucket the client
// can never read directly.
export async function GET(request: NextRequest) {
  const orderItemId = request.nextUrl.searchParams.get("orderItemId");
  if (!orderItemId) {
    return NextResponse.json({ error: "Missing order item." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: item, error } = await admin
    .from("order_items")
    .select("is_digital, digital_file_path, orders(buyer_id, status)")
    .eq("id", orderItemId)
    .maybeSingle();

  if (error || !item) {
    return NextResponse.json({ error: "Order item not found." }, { status: 404 });
  }

  const order = item.orders as unknown as { buyer_id: string; status: string } | null;

  if (!order || order.buyer_id !== user.id) {
    return NextResponse.json({ error: "This isn't your order." }, { status: 403 });
  }
  if (order.status !== "paid") {
    return NextResponse.json({ error: "This order hasn't been paid for." }, { status: 403 });
  }
  if (!item.is_digital || !item.digital_file_path) {
    return NextResponse.json({ error: "This item has no digital file." }, { status: 400 });
  }

  const { data: signed, error: signError } = await admin.storage
    .from("digital-files")
    .createSignedUrl(item.digital_file_path, 60 * 10); // 10 minutes

  if (signError || !signed) {
    return NextResponse.json(
      { error: signError?.message || "Could not generate a download link." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: signed.signedUrl });
}
