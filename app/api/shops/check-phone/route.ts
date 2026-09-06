import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get("phone")?.trim();

  if (!phone) {
    return NextResponse.json({ error: "Missing phone number." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shops")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ available: !data });
}
