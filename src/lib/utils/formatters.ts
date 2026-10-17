// BongzMoto - South African Formatting & Normalization Utilities

/**
 * Normalizes a South African phone number into E.164 format (+27...)
 * Handles inputs like:
 * - "082 123 4567" -> "+27821234567"
 * - "0821234567"   -> "+27821234567"
 * - "27821234567"  -> "+27821234567"
 * - "+27 82 123 4567" -> "+27821234567"
 */
export function normalizeSouthAfricanPhone(input: string): string {
  if (!input) return '';
  // Remove spaces, hyphens, parentheses, dots
  let cleaned = input.replace(/[\s\-\(\)\.]/g, '');

  // If starts with +27
  if (cleaned.startsWith('+27')) {
    return cleaned;
  }
  // If starts with 27
  if (cleaned.startsWith('27') && cleaned.length >= 11) {
    return `+${cleaned}`;
  }
  // If starts with 0 (e.g. 082, 073, 061)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `+27${cleaned.slice(1)}`;
  }

  // Return cleaned or prefixed with + if starts with digits
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

/**
 * Formats a phone number for South African local display
 * e.g. "+27821234567" -> "082 123 4567"
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('+27') && cleaned.length === 12) {
    const local = '0' + cleaned.slice(3);
    return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Normalizes South African vehicle registration plates
 * Removes spaces, hyphens, dots and converts to uppercase
 * e.g. "ca 123-456" -> "CA123456"
 * e.g. "ab 12 cd gp" -> "AB12CDGP"
 */
export function normalizeRegistration(plate: string): string {
  if (!plate) return '';
  return plate.replace(/[\s\-\.]/g, '').toUpperCase();
}

/**
 * Formats registration for display
 * e.g. "AB12CDGP" -> "AB 12 CD GP"
 * e.g. "CA123456" -> "CA 123-456"
 */
export function formatRegistrationDisplay(plate: string): string {
  if (!plate) return '';
  const clean = normalizeRegistration(plate);

  // Common Gauteng format: 2 letters, 2 digits, 2 letters, GP (e.g. AB12CDGP)
  if (/^[A-Z]{2}\d{2}[A-Z]{2}GP$/.test(clean)) {
    return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)} GP`;
  }
  // Western Cape e.g. CA123456 or CFM12345
  if (/^C[A-Z]{1,2}\d+$/.test(clean)) {
    const match = clean.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      const code = match[1];
      const num = match[2];
      if (num.length >= 4) {
        return `${code} ${num.slice(0, 3)}-${num.slice(3)}`;
      }
      return `${code} ${num}`;
    }
  }
  // Standard generic fallback
  return clean;
}

/**
 * Formats integer cents into South African Rand (ZAR)
 * e.g. 125000 -> "R 1 250.00"
 */
export function formatZAR(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || isNaN(cents)) {
    return 'R 0.00';
  }
  const rands = cents / 100;
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rands).replace('ZAR', 'R');
}

/**
 * Formats date into readable string (e.g. 15 Oct 2026, 14:30)
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
}
