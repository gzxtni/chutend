/**
 * Intelligent SMS OTP / Verification Code Detector
 * 
 * Accurately extracts real OTP codes (4-8 digits) ONLY when present in genuine
 * verification messages, strictly ignoring:
 * - Currency amounts (e.g. 'Rs.5535', 'INR 2000', 'Rs0.00', '$50')
 * - Calendar years & dates (e.g. '25-Sep-2026', '2025', '2026-09-25')
 * - Account / Reference / Card numbers (e.g. 'A/C8609890859', 'Ref #10924', 'card ending 4920')
 * - Timestamps & call durations (e.g. '00:00:59')
 * - URLs and query params (e.g. 'bit.ly/4gmStZA?59')
 */

export function extractOtp(text) {
  if (!text || typeof text !== 'string') return null;

  const clean = text.trim();
  const lower = clean.toLowerCase();

  // 1. Mandatory requirement: Message must contain an authentic OTP/verification keyword
  const hasOtpContext = /\b(otp|one[-\s]time\s+password|verification|verify|confirmation\s+code|security\s+code|login\s+code|auth\s+code|passcode|secret\s+code|confirm\s+code|login\s+pin)\b/i.test(lower);
  if (!hasOtpContext) {
    return null;
  }

  // 2. Ordered high-confidence patterns (from most specific to contextual)
  const patterns = [
    // Direct label: "OTP: 893814", "OTP is 893814", "OTP - 893814", "OTP=893814", "OTP 893814"
    /\b(?:otp|one[-\s]time\s+password)[\s:=–#-]+(?:is\s+)?([0-9]{4,8})\b/i,

    // Specific verification/security/confirmation code label: "verification code is 492019", "verification code: 492019"
    /\b(?:verification|security|login|auth|confirm|confirmation)\s+code[\s:=–#-]+(?:is\s+)?([0-9]{4,8})\b/i,

    // Reverse context: "893814 is your OTP / verification code / confirmation code"
    /\b([0-9]{4,8})\s+(?:is\s+(?:your|the)\s+(?:secret\s+)?(?:otp|one[-\s]time\s+password|verification|verify\s+code|passcode|security\s+code|confirmation\s+code))/i,

    // Google / standard formatted: "G-893814 is your Google verification code"
    /\b(?:G|V|ID)[-–]([0-9]{4,8})\s+(?:is\s+your\s+)?(?:verification|google|auth)/i,

    // Directive: "Use 893814 as your OTP / to verify / to login"
    /(?:is|use|enter)\s+([0-9]{4,8})\s+(?:as\s+(?:your\s+)?(?:otp|code|verification|passcode)|to\s+(?:login|verify|complete|authenticate))/i,

    // "code: 893814", "pin: 893814" (only when message passed hasOtpContext)
    /\b(?:code|pin)[\s:=–#-]+([0-9]{4,8})\b/i,

    // "is your verification code: 893814" or "is 893814" where OTP was mentioned earlier in the sentence
    /(?:code|otp)[\s\S]{1,40}?\bis\s+([0-9]{4,8})\b/i,

    // Proximity fallback: OTP keyword followed closely by digits
    /\b(?:otp|passcode)[\s\S]{1,30}?\b([0-9]{4,8})\b/i
  ];

  // Helper to validate candidate number is not a false positive
  const isValidCandidate = (code, matchIndex) => {
    if (!code || code.length < 4 || code.length > 8) return false;

    // Check surrounding snippet in clean text
    const startIdx = Math.max(0, matchIndex - 20);
    const endIdx = Math.min(clean.length, matchIndex + code.length + 20);
    const contextBefore = clean.substring(startIdx, matchIndex);
    const contextAfter = clean.substring(matchIndex + code.length, endIdx);

    // 1. Exclude currency prefixes: Rs, INR, ₹, $, EUR, etc.
    if (/(?:rs\.?|inr|₹|\$|eur|usd|gbp)\s*$/i.test(contextBefore)) {
      return false;
    }

    // 2. Exclude currency suffixes: /-, rs, inr
    if (/^\s*(?:\/[-–]|rs\b|inr\b)/i.test(contextAfter)) {
      return false;
    }

    // 3. Exclude account / card / phone references: A/C, Acct, Card ending
    if (/(?:a\/c|acct|acc|account|card|ending|mobile|call|ph|ref)[\s#:]*$/i.test(contextBefore)) {
      return false;
    }

    // 4. Exclude dates and years: e.g. "25-Sep-2026", "2026-09-25", "Exp:2026"
    if (code.length === 4 && (code.startsWith('19') || code.startsWith('20'))) {
      const year = parseInt(code, 10);
      if (year >= 2020 && year <= 2035) {
        // If attached to hyphen/slash like -2026 or /2026, or preceded by month name
        if (/[-/]\s*$/i.test(contextBefore) || /^\s*[-/]/.test(contextAfter)) {
          return false;
        }
        if (/(?:exp|expiry|validity|date|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\s\S]{0,10}$/i.test(contextBefore)) {
          return false;
        }
      }
    }

    // 5. Exclude time patterns: e.g. 00:00:59
    if (/(?::\s*)$/.test(contextBefore) && /^(?:\s*:)/.test(contextAfter)) {
      return false;
    }

    return true;
  };

  for (const regex of patterns) {
    const match = clean.match(regex);
    if (match && match[1]) {
      const code = match[1];
      const matchIndex = match.index + match[0].lastIndexOf(code);
      if (isValidCandidate(code, matchIndex)) {
        return code;
      }
    }
  }

  return null;
}
