import { describe, expect, it } from "vitest";
import { maskData } from "../../src/security/data-masker";
import { SensitiveMatch } from "../../src/shared/types";

describe("data-masker", () => {
  it("returns unchanged text when mode is 'skip'", () => {
    const text = "Contact user@example.com for account 12345678";
    const matches: SensitiveMatch[] = [
      { type: "email", value: "user@example.com", startIndex: 8, endIndex: 24 },
      { type: "bank_account", value: "12345678", startIndex: 37, endIndex: 45 },
    ];

    expect(maskData(text, matches, "skip")).toBe(text);
  });

  it("masks all alphanumeric characters when mode is 'full'", () => {
    const text = "Email: user@example.com";
    const matches: SensitiveMatch[] = [
      { type: "email", value: "user@example.com", startIndex: 7, endIndex: 23 },
    ];

    expect(maskData(text, matches, "full")).toBe("Email: ****@*******.***");
  });

  it("masks partially by keeping first and last 20% visible when mode is 'partial'", () => {
    const text = "Token AB12CD34EF";
    const matches: SensitiveMatch[] = [
      { type: "custom", value: "AB12CD34EF", startIndex: 6, endIndex: 16 },
    ];

    expect(maskData(text, matches, "partial")).toBe("Token AB******EF");
  });

  it("uses per-type strategy when mode is 'smart'", () => {
    const text = "mail user@example.com key AKIAABCDEFGHIJKLMNOP";
    const matches: SensitiveMatch[] = [
      { type: "email", value: "user@example.com", startIndex: 5, endIndex: 21 },
      {
        type: "aws_key",
        value: "AKIAABCDEFGHIJKLMNOP",
        startIndex: 26,
        endIndex: 46,
      },
    ];

    const masked = maskData(text, matches, "smart");
    expect(masked).toContain("use*@*******.com");
    expect(masked).toContain("********************");
    expect(masked).not.toContain("AKIAABCDEFGHIJKLMNOP");
  });

  it("handles multiple matches in one string", () => {
    const text = "mail user@example.com card 4111111111111111";
    const matches: SensitiveMatch[] = [
      { type: "email", value: "user@example.com", startIndex: 5, endIndex: 21 },
      {
        type: "credit_card",
        value: "4111111111111111",
        startIndex: 27,
        endIndex: 43,
      },
    ];

    expect(maskData(text, matches, "full")).toBe(
      "mail ****@*******.*** card ****************",
    );
  });

  it("handles overlapping and adjacent matches consistently", () => {
    const overlappingText = "abcdefghij";
    const overlappingMatches: SensitiveMatch[] = [
      { type: "custom", value: "cdef", startIndex: 2, endIndex: 6 },
      { type: "custom", value: "efgh", startIndex: 4, endIndex: 8 },
    ];
    const adjacentText = "abcdefgh";
    const adjacentMatches: SensitiveMatch[] = [
      { type: "custom", value: "abcd", startIndex: 0, endIndex: 4 },
      { type: "custom", value: "efgh", startIndex: 4, endIndex: 8 },
    ];

    expect(maskData(overlappingText, overlappingMatches, "full")).toBe(
      "ab********ij",
    );
    expect(maskData(adjacentText, adjacentMatches, "full")).toBe("********");
  });

  it("returns original text when matches array is empty", () => {
    const text = "Nothing to mask here";
    expect(maskData(text, [], "full")).toBe(text);
    expect(maskData(text, [], "partial")).toBe(text);
  });
});
