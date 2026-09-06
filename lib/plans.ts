export type PlanId = "starter" | "business" | "professional";

// Higher number = higher tier. Used to block downgrades on renewal.
export const PLAN_TIER: Record<PlanId, number> = {
  starter: 1,
  business: 2,
  professional: 3,
};

export const PLAN_AMOUNTS_KOBO: Record<PlanId, number> = {
  starter: 250000, // ₦2,500
  business: 500000, // ₦5,000
  professional: 1000000, // ₦10,000
};

export const PLAN_DURATION_DAYS: Record<PlanId, number> = {
  starter: 30,
  business: 30,
  professional: 30,
};

export const LEADS_ADDON_KOBO = 3150000; // ₦31,500

export function isPlanId(value: unknown): value is PlanId {
  return value === "starter" || value === "business" || value === "professional";
}
