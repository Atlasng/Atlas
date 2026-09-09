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
      "quantity, size, color, products(id, name, price, category, shop_id, digital_file_path)"
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
    size: string | null;
    color: string | null;
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

  const hasPhysical = validRows.some(
    (row) => row.products!.category !== "Digital Products"
  );

  // Physical items ship to a motor park, not a home address — this is
  // the buyer's saved pickup point, snapshotted onto the order below.
  let deliveryState: string | null = null;
  let deliveryParkName: string | null = null;
  let deliveryFee = 0;

  if (hasPhysical) {
    const { data: profile } = await admin
      .from("profiles")
      .select("delivery_state, delivery_motor_park_id, motor_parks:delivery_motor_park_id(name)")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.delivery_state || !profile?.delivery_motor_park_id) {
      return NextResponse.json(
        { error: "Set a delivery address before checking out." },
        { status: 400 }
      );
    }

    deliveryState = profile.delivery_state;
    deliveryParkName =
      (profile.motor_parks as unknown as { name: string } | null)?.name ?? null;

    // Narrow to a non-null const so TS knows it's safe to use as an index
    // below — `deliveryState` itself is a mutable `let` from the outer
    // scope, so its type stays `string | null` even after the check above.
    const state = deliveryState;

    // Each shop in the cart charges its own delivery fee to the buyer's
    // state — a cart spanning 3 shops means 3 separate delivery fees,
    // since each shop ships independently.
    const physicalShopIds = Array.from(
      new Set(
        validRows
          .filter((row) => row.products!.category !== "Digital Products")
          .map((row) => row.products!.shop_id)
      )
    );

    const { data: shops, error: shopsError } = await admin
      .from("shops")
      .select("id, delivery_prices")
      .in("id", physicalShopIds);

    if (shopsError) {
      return NextResponse.json({ error: shopsError.message }, { status: 500 });
    }

    for (const shop of shops ?? []) {
      const prices = shop.delivery_prices as Record<string, number> | null;
      const fee = prices?.[state] ?? 0;
      deliveryFee += fee;
    }
  }

  const itemsTotal = validRows.reduce(
    (sum, row) => sum + row.products!.price * row.quantity,
    0
  );
  const totalNaira = itemsTotal + deliveryFee;
  const amountKobo = Math.round(totalNaira * 100);

  // Create the order as 'pending' up front — this is the record checkout
  // will complete once payment is verified. Price is snapshotted per item
  // so later product edits never change what was actually charged.
  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      buyer_id: user.id,
      total_amount: totalNaira,
      status: "pending",
      delivery_state: deliveryState,
      delivery_motor_park_name: deliveryParkName,
      delivery_fee: deliveryFee,
    })
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
    size: row.size,
    color: row.color,
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
