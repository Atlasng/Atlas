import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Paystack is not configured on the server." },
      { status: 500 }
    );
  }

  const { accountNumber, bankCode } = await request.json();

  if (!accountNumber || !bankCode) {
    return NextResponse.json(
      { error: "Account number and bank are required." },
      { status: 400 }
    );
  }

  const res = await fetch(
    `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(
      accountNumber
    )}&bank_code=${encodeURIComponent(bankCode)}`,
    {
      headers: { Authorization: `Bearer ${secretKey}` },
      cache: "no-store",
    }
  );
  const json = await res.json();

  if (!json.status) {
    return NextResponse.json(
      { error: json.message || "Could not verify that account." },
      { status: 400 }
    );
  }

  return NextResponse.json({ accountName: json.data.account_name as string });
}
