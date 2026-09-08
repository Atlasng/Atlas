// Normalizes a Nigerian phone number (however the seller typed it) into the
// digits-only, country-code-prefixed format wa.me expects.
// "0803 123 4567" -> "2348031234567", "+234 803 123 4567" -> "2348031234567"
function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return `234${digits}`;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const number = toWhatsAppNumber(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
