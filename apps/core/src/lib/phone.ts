/**
 * Phone-number normalization for PrismVoice.
 *
 * Calls arrive from VoIP providers (Dialpad, etc.) in mixed formats and AMS
 * systems store them differently again. Everything inside Prism Core is
 * normalized to E.164 (`+1XXXXXXXXXX` for US numbers) so lookups match.
 *
 * US-default, dependency-free — enough for the agencies we serve. If a future
 * tenant needs full international parsing, swap in `libphonenumber-js` here.
 */

/** Strip formatting, `tel:` URIs, and extensions down to bare digits (+ prefix). */
function clean(raw: string): { digits: string; hadPlus: boolean } {
  let s = raw.trim();
  if (s.toLowerCase().startsWith("tel:")) s = s.slice(4);
  // Drop extensions: everything from the first x / , / ; / # onward.
  const ext = s.match(/^([^x,;#]+)/i);
  if (ext) s = ext[1]!;
  const hadPlus = s.trimStart().startsWith("+");
  return { digits: s.replace(/\D/g, ""), hadPlus };
}

/**
 * Normalize a phone number to E.164. Returns null if it cannot be a real
 * dialable number. US numbers are assumed when there is no country code.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input || typeof input !== "string") return null;
  let { digits } = clean(input);
  const { hadPlus } = clean(input);
  if (!digits) return null;

  // 11 digits starting with the US country code → drop it to the base 10.
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);

  if (digits.length === 10) return `+1${digits}`;
  // Already-international numbers (kept as-is): 8–15 digits with a + sign,
  // or an unambiguous 11–15 digit string.
  if (hadPlus && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

/** Format a number for display: `(509) 665-0500` for US, E.164 otherwise. */
export function formatPhoneForDisplay(input: string | null | undefined): string {
  if (!input) return "";
  const n = normalizePhone(input);
  if (n && n.startsWith("+1") && n.length === 12) {
    return `(${n.slice(2, 5)}) ${n.slice(5, 8)}-${n.slice(8)}`;
  }
  return n ?? input;
}
