import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

// Called once a day by a scheduler (Vercel Cron, or any external cron
// service) — not by users. Protected by a shared secret so nobody else
// can trigger it and spam your sellers or your Gmail sending limit.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const siteUrl = request.nextUrl.origin;

  const { data: shops, error } = await admin
    .from("shops")
    .select("id, user_id, shop_name, plan, plan_expires_at, last_reminder_sent_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const shop of shops ?? []) {
    const expiresAt = new Date(shop.plan_expires_at);
    const daysLeft = Math.ceil(
      (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Remind for the 5 days leading up to expiry, and for 3 days after —
    // outside that window, don't bother sending anything.
    const inReminderWindow = daysLeft <= 5 && daysLeft >= -3;
    if (!inReminderWindow) {
      continue;
    }

    const alreadyRemindedToday =
      shop.last_reminder_sent_at &&
      new Date(shop.last_reminder_sent_at) >= todayStart;
    if (alreadyRemindedToday) {
      skipped += 1;
      continue;
    }

    const { data: userData } = await admin.auth.admin.getUserById(shop.user_id);
    const email = userData?.user?.email;
    if (!email) {
      skipped += 1;
      continue;
    }

    const isExpired = daysLeft < 0;
    const planLabel = shop.plan[0].toUpperCase() + shop.plan.slice(1);
    const renewUrl = `${siteUrl}/dashboard/plans`;

    const subject = isExpired
      ? `Your Atlas shop "${shop.shop_name}" plan has expired`
      : `Your Atlas shop "${shop.shop_name}" expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;

    const message = isExpired
      ? `Your ${planLabel} plan for ${shop.shop_name} has expired. Your shop is no longer active on Atlas until you renew.`
      : `Your ${planLabel} plan for ${shop.shop_name} expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Renew now to keep your shop active without any interruption.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <p style="font-size: 20px; font-weight: bold; color: #0B1E3D; margin-bottom: 4px;">Atlas</p>
        <p style="font-size: 15px; color: #0B1E3D; line-height: 1.5;">${message}</p>
        <p style="margin: 28px 0;">
          <a href="${renewUrl}"
             style="background-color: #1E56C6; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 14px; font-weight: 600; display: inline-block;">
            Renew your plan
          </a>
        </p>
        <p style="font-size: 13px; color: #4A5C78;">
          Or copy this link into your browser: ${renewUrl}
        </p>
      </div>
    `;

    const text = `${message}\n\nRenew your plan: ${renewUrl}`;

    try {
      await sendEmail({ to: email, subject, html, text });
      await admin
        .from("shops")
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq("id", shop.id);
      sent += 1;
    } catch (err) {
      console.error(`Failed to send expiry reminder to ${email}`, err);
      failed += 1;
    }
  }

  return NextResponse.json({ success: true, sent, skipped, failed });
}
