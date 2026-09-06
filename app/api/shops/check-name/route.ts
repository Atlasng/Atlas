import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim();

  if (!name) {
    return NextResponse.json({ error: "Missing store name." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shops")
    .select("id")
    .eq("shop_name_normalized", name.toLowerCase())
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ available: !data });
}
