import { NextRequest, NextResponse } from "next/server";

// PLACEHOLDER — no NIN verification provider is wired up yet.
// Swap this out for a real call to VerifyMe, Youverify, Prembly
// (IdentityPass), Dojah, or QoreID once you've picked one. The real
// call should return the actual name on record for the NIN, which the
// frontend then compares against what the seller typed and, later,
// against their bank account name.
export async function POST(request: NextRequest) {
  const { nin, fullName } = await request.json();

  if (!nin || !/^\d{11}$/.test(nin)) {
    return NextResponse.json(
      { error: "Enter a valid 11-digit NIN." },
      { status: 400 }
    );
  }

  if (!fullName || !fullName.trim()) {
    return NextResponse.json(
      { error: "Missing full name to verify against." },
      { status: 400 }
    );
  }

  // Simulate network latency.
  await new Promise((resolve) => setTimeout(resolve, 800));

  // TODO: replace with the real provider's response. For now this always
  // succeeds and echoes back the name the seller typed, so the rest of the
  // flow (plan selection, bank match, payment) can be built and tested.
  return NextResponse.json({ verified: true, verifiedName: fullName.trim() });
}
