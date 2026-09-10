import { createClient } from "@/lib/supabase/client";

export type ShopEventType = "view" | "whatsapp_click";

/**
 * Logs a shop_events row for real-time dashboard stats (Shop views,
 * WhatsApp clicks). Fire-and-forget on purpose — analytics should never
 * block or break the buyer's actual flow (viewing a page, opening
 * WhatsApp), so we don't await this or throw on failure.
 */
export function logShopEvent(
  shopId: string,
  type: ShopEventType,
  productId?: string | null
) {
  const supabase = createClient();

  supabase
    .from("shop_events")
    .insert({ shop_id: shopId, type, product_id: productId ?? null })
    .then(({ error }) => {
      if (error) {
        // Swallow — don't disrupt the user, just note it for debugging.
        console.error("logShopEvent failed:", error.message);
      }
    });
}
