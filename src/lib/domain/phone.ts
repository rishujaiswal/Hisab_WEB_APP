// ============================================================
// Phone normalization and WhatsApp URL helpers
// ============================================================

/**
 * Normalize a phone number to digits only, with 91 prefix for 10-digit Indian numbers.
 * - Strips all non-digit characters
 * - Removes leading + or 00
 * - If 10 digits, prepends 91
 * - Otherwise keeps as-is (international)
 */
export function normalizePhone(input: string): string {
  // Strip all non-digits
  let digits = input.replace(/\D/g, '');

  // Remove leading 00 (international dialing prefix)
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // If exactly 10 digits, treat as Indian and add 91
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // If 12 digits starting with 91, keep as-is (already has country code)
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }

  return digits;
}

/**
 * Format phone for display: +91 XXXXX XXXXX
 */
export function formatPhoneDisplay(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return input;
}

/**
 * Mask phone number showing only last 4 digits: ******4321
 */
export function maskPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return '•'.repeat(digits.length - 4) + digits.slice(-4);
}

/**
 * Validate a 10-digit Indian phone number (digits only).
 */
export function isValidIndianPhone(input: string): boolean {
  const digits = input.replace(/\D/g, '');
  return digits.length === 10 && /^[6-9]/.test(digits);
}

/**
 * Get WhatsApp number: use whatsappNumber if set, else phoneNumber.
 */
export function getWhatsAppNumber(
  whatsappNumber: string,
  phoneNumber: string
): string {
  const wa = whatsappNumber?.trim();
  return wa ? wa : phoneNumber;
}

/**
 * Build a wa.me URL with URL-encoded text.
 */
export function whatsappUrl(phone: string, text: string): string {
  const normalized = normalizePhone(phone);
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${normalized}?text=${encoded}`;
}
