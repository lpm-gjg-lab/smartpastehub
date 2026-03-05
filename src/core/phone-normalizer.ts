/**
 * phone-normalizer.ts
 *
 * Normalizes phone numbers into a clean, consistent format.
 *
 * Handles:
 *  1. Indonesian numbers: 08xx → +62 8xx
 *  2. International numbers with country code: +1, +44, +60, etc.
 *  3. Strip noise: parentheses, dots, excessive dashes, leading/trailing spaces
 *  4. Group digits for readability: +62 812 3456 7890
 *
 * Preserves:
 *  - Country code if already present
 *  - Numbers that can't be parsed (returns original)
 */

/**
 * Strip all non-digit, non-plus characters from a phone string,
 * keeping only digits and the leading + sign.
 */
function extractDigits(phone: string): string {
    return phone.replace(/[^\d+]/g, "");
}

/**
 * Format a digit string into groups for readability.
 * Strategy: country code + 3-4-4 grouping (common for mobile).
 */
function formatGrouped(countryCode: string, national: string): string {
    // For Indonesian numbers: +62 812 3456 7890
    // For general: try 3-4-4 pattern, or 3-3-4 for shorter numbers
    const digits = national.replace(/\D/g, "");

    if (digits.length <= 4) {
        return `${countryCode} ${digits}`;
    }
    if (digits.length <= 7) {
        return `${countryCode} ${digits.slice(0, 3)} ${digits.slice(3)}`;
    }
    if (digits.length <= 10) {
        // 3-4-3 or 3-4-4
        return `${countryCode} ${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
    }
    // 3-4-4+ for very long numbers
    return `${countryCode} ${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
}

/**
 * Normalize a phone number string into a consistent, readable format.
 * Returns the original string if it cannot be meaningfully normalized.
 */
export function normalizePhone(phone: string): string {
    const trimmed = phone.trim();
    const raw = extractDigits(trimmed);

    // Must have at least 7 digits to be a real phone number
    const digitCount = raw.replace(/\D/g, "").length;
    if (digitCount < 7) {
        return trimmed; // too short, don't touch
    }

    // ── Indonesian: starts with 0 (local format) ──────────────────────────────
    if (raw.startsWith("0") && !raw.startsWith("+")) {
        const national = raw.slice(1); // drop leading 0
        return formatGrouped("+62", national);
    }

    // ── Indonesian: starts with 62 (country code without +) ───────────────────
    if (raw.startsWith("62") && !raw.startsWith("+") && raw.length >= 10) {
        const national = raw.slice(2);
        return formatGrouped("+62", national);
    }

    // ── International: starts with + ──────────────────────────────────────────
    if (raw.startsWith("+")) {
        const digits = raw.slice(1);

        // Detect country code length (1-3 digits)
        // Common: +1 (US/CA), +44 (UK), +62 (ID), +60 (MY), +65 (SG), +81 (JP)
        let ccLen = 1;
        const oneDigitCodes = ["1", "7"];
        const twoDigitCodes = [
            "20", "27", "30", "31", "32", "33", "34", "36", "39",
            "40", "41", "43", "44", "45", "46", "47", "48", "49",
            "51", "52", "53", "54", "55", "56", "57", "58",
            "60", "61", "62", "63", "64", "65", "66",
            "70", "71", "72", "73", "74", "75", "76", "77", "78", "79",
            "81", "82", "84", "86",
            "90", "91", "92", "93", "94", "95", "98",
        ];

        if (oneDigitCodes.includes(digits.slice(0, 1))) {
            ccLen = 1;
        } else if (twoDigitCodes.includes(digits.slice(0, 2))) {
            ccLen = 2;
        } else {
            ccLen = 3;
        }

        const cc = `+${digits.slice(0, ccLen)}`;
        const national = digits.slice(ccLen);
        return formatGrouped(cc, national);
    }

    // ── Unrecognized format — just clean up spaces/noise ──────────────────────
    // Remove double spaces and extra noise chars but keep the structure
    return trimmed.replace(/[\s()-]+/g, " ").replace(/\s*-\s*/g, "-").trim();
}
