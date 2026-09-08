// The 36 states, plus the FCT (Abuja) — included so sellers can actually
// price delivery to the capital. If you truly want exactly 36 entries with
// no FCT, just remove the last line.
export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
  "FCT (Abuja)",
] as const;

export type DeliveryPrices = Record<string, number>;

// A shop's delivery pricing only "counts" as set once every state has an
// explicit, non-negative number — used to gate access to product listing.
export function hasCompleteDeliveryPricing(
  prices: DeliveryPrices | null | undefined
): boolean {
  if (!prices) return false;
  return NIGERIAN_STATES.every(
    (state) => typeof prices[state] === "number" && prices[state] >= 0
  );
}
