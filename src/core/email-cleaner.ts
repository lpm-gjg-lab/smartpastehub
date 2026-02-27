/**
 * email-cleaner.ts
 *
 * Strips common noise from copy-pasted email bodies:
 *   1. Quoted reply blocks  (lines starting with ">", or "On ... wrote:" headers)
 *   2. Trailing web/newsletter junk (Unsubscribe, Share this, Read more…)
 *   3. Multiple blank lines → single blank line
 */

export interface EmailCleanOptions {
  /** Strip "> quoted reply" lines. Default: true */
  stripQuotedReply?: boolean;
  /** Strip "On Mon, 1 Jan 2024 at 10:00, User <x@y.com> wrote:" headers. Default: true */
  stripReplyHeader?: boolean;
  /** Strip trailing newsletter/web junk. Default: true */
  stripTrailingJunk?: boolean;
  /** Collapse 3+ blank lines to 1. Default: true */
  collapseBlankLines?: boolean;
}

const DEFAULT_OPTIONS: Required<EmailCleanOptions> = {
  stripQuotedReply: true,
  stripReplyHeader: true,
  stripTrailingJunk: true,
  collapseBlankLines: true,
};

// "On Fri, 10 Jan 2025 at 09:30, John Doe <john@example.com> wrote:"
// "Pada Jum, 10 Jan 2025 pukul 09.30, John Doe <john@example.com> menulis:"
const REPLY_HEADER_RE = /^(On|Pada)\s+.{5,80}(wrote|menulis)\s*:\s*$/im;

// Lines that are part of a quoted reply block
const QUOTED_LINE_RE = /^>+\s?/;

// Common trailing junk patterns from newsletters, web pages, forwarded email
const TRAILING_JUNK_PATTERNS: RegExp[] = [
  /^unsubscribe.*$/im,
  /^(to unsubscribe|click here to unsubscribe).*$/im,
  /^(share this|share:|bagikan).*$/im,
  /^(read more|baca selengkapnya|read the full|continue reading).*$/im,
  /^(view in browser|lihat di browser).*$/im,
  /^\[?(view|open|see)\s+(this\s+)?(email|message|newsletter)\s+in.*$/im,
  /^(follow us|ikuti kami)\s*[:|on].*$/im,
  /^sent from (my )?(iphone|android|ipad|samsung|gmail|outlook).*$/im,
  /^get outlook for (ios|android).*$/im,
  /^-{3,}\s*(original message|forwarded message|pesan asli|pesan diteruskan)\s*-{3,}$/im,
];

export function cleanEmail(
  text: string,
  options: EmailCleanOptions = {},
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lines = text.split("\n");
  const result: string[] = [];
  let inQuotedBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    // Detect reply header → skip this line and everything below (the quoted block)
    if (opts.stripReplyHeader && REPLY_HEADER_RE.test(line)) {
      inQuotedBlock = true;
      continue;
    }

    // Skip quoted lines
    if (opts.stripQuotedReply && QUOTED_LINE_RE.test(line)) {
      inQuotedBlock = true;
      continue;
    }

    // If we hit a non-quoted, non-empty line after a quoted block → resume
    if (inQuotedBlock && line.trim().length > 0) {
      inQuotedBlock = false;
    }

    if (inQuotedBlock) continue;

    // Strip trailing junk lines
    if (opts.stripTrailingJunk) {
      const isJunk = TRAILING_JUNK_PATTERNS.some((re) => re.test(line.trim()));
      if (isJunk) continue;
    }

    result.push(line);
  }

  let out = result.join("\n");

  if (opts.collapseBlankLines) {
    out = out.replace(/\n{3,}/g, "\n\n");
  }

  return out.trim();
}
