/**
 * base64-codec.ts
 *
 * Base64 detection and UTF-8 text encoding/decoding helpers.
 */

const BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function looksLikeReadableText(text: string): boolean {
  if (!text) {
    return false;
  }

  let readableCount = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    const isLineBreak = code === 9 || code === 10 || code === 13;
    const isPrintableAscii = code >= 32 && code <= 126;
    const isExtendedChar = code >= 160;

    if (isLineBreak || isPrintableAscii || isExtendedChar) {
      readableCount += 1;
    }
  }

  return readableCount / text.length >= 0.9;
}

/**
 * Check whether text looks like valid Base64 that decodes to UTF-8 text.
 */
export function isBase64(text: string): boolean {
  const candidate = text.trim();

  if (candidate.length < 8 || candidate.length % 4 !== 0) {
    return false;
  }

  if (!BASE64_PATTERN.test(candidate)) {
    return false;
  }

  try {
    const decodedBuffer = Buffer.from(candidate, "base64");
    if (decodedBuffer.length === 0 || decodedBuffer.includes(0)) {
      return false;
    }

    const decoded = decodedBuffer.toString("utf8");
    if (!decoded || decoded.includes("\uFFFD")) {
      return false;
    }

    const reEncoded = Buffer.from(decoded, "utf8").toString("base64");
    if (reEncoded !== candidate) {
      return false;
    }

    return looksLikeReadableText(decoded);
  } catch {
    return false;
  }
}

/**
 * Decode Base64 text into UTF-8.
 * Returns original input when decoding is not safe.
 */
export function decodeBase64(text: string): string {
  const candidate = text.trim();
  if (!isBase64(candidate)) {
    return text;
  }
  return Buffer.from(candidate, "base64").toString("utf8");
}

/**
 * Encode UTF-8 text into Base64.
 */
export function encodeBase64(text: string): string {
  return Buffer.from(text, "utf8").toString("base64");
}

/**
 * Auto-convert Base64 input to UTF-8 text when valid.
 */
export function autoConvertBase64(text: string): string {
  if (!isBase64(text)) {
    return text;
  }
  return decodeBase64(text);
}
