/**
 * Phone numbers are the login identifier in this app, but users typically
 * type them in many shapes — `+998 90 962 51 46`, `+998909625146`,
 * `998909625146`, `90 962 51 46`, `(90) 962-51-46`. We normalise everything
 * to a single canonical form: `+998` followed by 9 digits.
 *
 * If the input doesn't look like an Uzbek mobile number we still strip
 * formatting and prefix `+`, so foreign numbers (e.g. tests, future
 * countries) keep working.
 */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = String(raw).replace(/\D+/g, '');
  if (!digits) return '';

  // Already starts with country code 998 → just prefix `+`.
  if (digits.startsWith('998') && digits.length === 12) {
    return '+' + digits;
  }
  // 9-digit local Uzbek number → assume +998.
  if (digits.length === 9) {
    return '+998' + digits;
  }
  // Anything else: keep digits as-is, prefix +. Caller's regex validation
  // will reject obviously broken values.
  return '+' + digits;
}
