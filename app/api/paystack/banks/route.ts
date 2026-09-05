import { NextResponse } from "next/server";

export async function GET() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Paystack is not configured on the server." },
      { status: 500 }
    );
  }

  const res = await fetch("https://api.paystack.co/bank?country=nigeria", {
    headers: { Authorization: `Bearer ${secretKey}` },
    cache: "no-store",
  });
  const json = await res.json();

  if (!json.status) {
    return NextResponse.json(
      { error: json.message || "Could not load banks." },
      { status: 502 }
    );
  }

  const banks = (json.data as Array<{ name: string; code: string }>).map(
    (b) => ({ name: b.name, code: b.code })
  );

  return NextResponse.json({ banks });
}
