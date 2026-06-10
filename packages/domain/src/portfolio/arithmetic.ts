/**
 * Minimal decimal helpers for the V1 portfolio engine.
 * All values travel as exact decimal strings; arithmetic uses JS floats and
 * rounds to prevent runaway precision drift. For V1 simulation amounts
 * (< 10M, ≤ 8 decimal places), IEEE 754 doubles carry sufficient precision.
 */

/** Parse an exact decimal string to a float. */
export function toFloat(value: string): number {
  return parseFloat(value);
}

/**
 * Format a float back to an exact decimal string.
 * Strips unnecessary trailing zeros but keeps at least the integer part.
 * Examples: 10000 → "10000", 189.5 → "189.5", 189.50000001 → "189.5".
 */
export function toDecimalString(value: number): string {
  // Use up to 8 decimal places, then strip trailing zeros.
  return Number(value.toFixed(8)).toString();
}

/** Multiply two decimal strings and return a decimal string. */
export function mul(a: string, b: string): string {
  return toDecimalString(toFloat(a) * toFloat(b));
}

/** Add two decimal strings and return a decimal string. */
export function add(a: string, b: string): string {
  return toDecimalString(toFloat(a) + toFloat(b));
}

/** Subtract b from a and return a decimal string. */
export function sub(a: string, b: string): string {
  return toDecimalString(toFloat(a) - toFloat(b));
}

/** Divide a by b and return a decimal string. */
export function div(a: string, b: string): string {
  return toDecimalString(toFloat(a) / toFloat(b));
}

/** Compare two decimal strings. Returns negative, 0, or positive. */
export function cmp(a: string, b: string): number {
  return toFloat(a) - toFloat(b);
}
