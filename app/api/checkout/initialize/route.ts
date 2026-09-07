import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const admin = createAdminClient();

  const { data: cartItems, error: cartError } = await admin
    .from("cart_items")
    .select(
      "quantity, products(id, name, price, category, shop_id, digital_file_path)"
    )
    .eq("user_id", user.id);

  if (cartError) {
    return NextResponse.json({ error: cartError.message }, { status: 500 });
  }

  if (!cartItems || cartItems.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  type CartRow = {
    quantity: number;
    products: {
      id: string;
      name: string;
      price: number;
      category: string;
      shop_id: string;
      digital_file_path: string | null;
    } | null;
  };

  const rows = cartItems as unknown as CartRow[];
  const validRows = rows.filter((row) => row.products !== null);

  if (validRows.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  const totalNaira = validRows.reduce(
    (sum, row) => sum + row.products!.price * row.quantity,
    0
  );
  const amountKobo = Math.round(totalNaira * 100);

  // Create the order as 'pending' up front — this is the record checkout
  // will complete once payment is verified. Price is snapshotted per item
  // so later product edits never change what was actually charged.
  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({ buyer_id: user.id, total_amount: totalNaira, status: "pending" })
    .select("id")
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      { error: orderError?.message || "Could not start checkout." },
      { status: 500 }
    );
  }

  const orderItems = validRows.map((row) => ({
    order_id: order.id,
    product_id: row.products!.id,
    shop_id: row.products!.shop_id,
    product_name: row.products!.name,
    price: row.products!.price,
    quantity: row.quantity,
    is_digital: row.products!.category === "Digital Products",
    digital_file_path: row.products!.digital_file_path,
  }));

  const { error: itemsError } = await admin.from("order_items").insert(orderItems);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const callbackUrl = `${request.nextUrl.origin}/checkout/callback`;

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      amount: amountKobo,
      callback_url: callbackUrl,
      metadata: { order_id: order.id, buyer_id: user.id },
    }),
  });

  const json = await res.json();

  if (!json.status) {
    return NextResponse.json(
      { error: json.message || "Could not start payment." },
      { status: 502 }
    );
  }

  await admin
    .from("orders")
    .update({ paystack_reference: json.data.reference })
    .eq("id", order.id);

  return NextResponse.json({
    authorizationUrl: json.data.authorization_url as string,
    orderId: order.id,
  });
}
