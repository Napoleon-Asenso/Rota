/**
 * Validation utilities for form inputs.
 */

/**
 * Real-time email validator:
 * - Displays "Enter a valid email address" when the user starts typing
 * - Clears the error as soon as the user starts typing the domain after the '@' symbol
 */
export function validateEmailRealtime(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const atIndex = trimmed.indexOf('@');
  // If no '@' is present, or '@' is the last character (domain not started yet)
  if (atIndex === -1 || atIndex === trimmed.length - 1) {
    return 'Enter a valid email address';
  }
  return null;
}

/**
 * Complete email validator for form submissions.
 */
export function validateEmailSubmit(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return 'Email Address is required';
  }
  // Enforces valid user@domain.tld format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Enter a valid email address';
  }
  return null;
}
