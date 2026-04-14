/**
 * Build a WhatsApp URL with Egypt country code logic.
 * - If phone starts with "0", replace leading 0 with "20"
 * - If phone starts with "2", use as-is
 * - Otherwise prepend "20"
 */
export function getWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  let formatted = digits;
  if (digits.startsWith("0")) {
    formatted = "2" + digits; // 01001234567 → 201001234567
  } else if (!digits.startsWith("2")) {
    formatted = "20" + digits;
  }
  return `https://wa.me/${formatted}`;
}
