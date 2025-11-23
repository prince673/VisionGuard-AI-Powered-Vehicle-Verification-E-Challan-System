/**
 * Security Service
 * Handles Input Validation, Threat Detection, and Policy Enforcement
 * adhering to CIA Triad (Confidentiality, Integrity, Availability).
 */

// List of common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  'guerrillamail.com',
  'temp-mail.org',
  'tempmail.com',
  'throwawaymail.com',
  'yopmail.com',
  'mailinator.com',
  'sharklasers.com',
  'maildrop.cc',
  'getairmail.com',
  'dispostable.com',
  'tempr.email',
  'trashmail.com',
  'mytemp.email',
  'mvrht.com',
  'supere.ml',
  'rhyta.com',
  'teleworm.us',
  'jourrapide.com'
]);

/**
 * Checks if an email belongs to a disposable/temporary email provider.
 * Enforces INTEGRITY by ensuring user identity validity.
 */
export const isDisposableEmail = (email: string): boolean => {
  if (!email || !email.includes('@')) return false;
  
  const domain = email.split('@')[1].toLowerCase();
  
  // Direct match
  if (DISPOSABLE_DOMAINS.has(domain)) return true;

  // Subdomain check (e.g., something.yopmail.com)
  for (const d of DISPOSABLE_DOMAINS) {
    if (domain.endsWith('.' + d)) return true;
  }

  return false;
};

/**
 * Validates password strength complexity.
 * Enforces CONFIDENTIALITY by ensuring strong secrets.
 */
export const isWeakPassword = (password: string): boolean => {
  // Min 8 chars, at least one number (Basic policy for this demo)
  const hasLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  return !(hasLength && hasNumber);
};
