import { describe, expect, it } from "vitest";
import { detectSensitiveData } from "../../src/security/sensitive-detector";

describe("sensitive-detector", () => {
  it("detects email and avoids false positives on plain strings", () => {
    const clean = detectSensitiveData("hello world without address");
    expect(clean).toEqual([]);

    const matches = detectSensitiveData(
      "Reach me at user.name+tag@example-domain.com now",
    );
    const emails = matches.filter((match) => match.type === "email");

    expect(emails).toHaveLength(1);
    expect(emails[0]?.value).toBe("user.name+tag@example-domain.com");
  });

  it("detects Indonesian phone numbers with +62, 62, and 0 prefixes", () => {
    const withPlus = detectSensitiveData("Call +62 812-3456-7890 immediately");
    const withCountry = detectSensitiveData("Call 6281234567890 immediately");
    const withZero = detectSensitiveData("Call 0812 3456 7890 immediately");

    expect(withPlus.some((match) => match.type === "phone_id")).toBe(true);
    expect(withCountry.some((match) => match.type === "phone_id")).toBe(true);
    expect(withZero.some((match) => match.type === "phone_id")).toBe(true);
  });

  it("detects international phone numbers", () => {
    const matches = detectSensitiveData("Emergency number: +1-800-555-1234");
    const intl = matches.filter((match) => match.type === "phone_intl");

    expect(intl).toHaveLength(1);
    expect(intl[0]?.value).toBe("+1-800-555-1234");
  });

  it("detects NIK with valid date components", () => {
    const matches = detectSensitiveData("NIK: 3201150901990001");
    const nik = matches.filter((match) => match.type === "nik");

    expect(nik).toHaveLength(1);
    expect(nik[0]?.value).toBe("3201150901990001");
  });

  it("detects major credit card patterns", () => {
    const visa = detectSensitiveData("Visa 4111111111111111");
    const mastercard = detectSensitiveData("Mastercard 5555555555554444");
    const amex = detectSensitiveData("Amex 3714496353984312");
    const discover = detectSensitiveData("Discover 6011111111111117");

    expect(visa.some((match) => match.type === "credit_card")).toBe(true);
    expect(mastercard.some((match) => match.type === "credit_card")).toBe(true);
    expect(amex.some((match) => match.type === "credit_card")).toBe(true);
    expect(discover.some((match) => match.type === "credit_card")).toBe(true);
  });

  it("detects NPWP with punctuation variants", () => {
    const dotted = detectSensitiveData("NPWP: 12.345.678.9-012.345");
    const compact = detectSensitiveData("NPWP: 123456789012345");

    expect(dotted.some((match) => match.type === "npwp")).toBe(true);
    expect(compact.some((match) => match.type === "npwp")).toBe(true);
  });

  it("detects passport IDs", () => {
    const matches = detectSensitiveData("Passport A1234567 ready");
    const passport = matches.filter((match) => match.type === "passport_id");

    expect(passport).toHaveLength(1);
    expect(passport[0]?.value).toBe("A1234567");
  });

  it("detects bank account number ranges of 8 to 16 digits", () => {
    const short = detectSensitiveData("Account 12345678");
    const long = detectSensitiveData("Account 1234567890123456");

    expect(short.some((match) => match.type === "bank_account")).toBe(true);
    expect(long.some((match) => match.type === "bank_account")).toBe(true);
  });

  it("detects IPv4 addresses", () => {
    const matches = detectSensitiveData("Server IP 192.168.100.25");
    const ips = matches.filter((match) => match.type === "ip_address");

    expect(ips).toHaveLength(1);
    expect(ips[0]?.value).toBe("192.168.100.25");
  });

  it("detects AWS access key IDs for AKIA and ASIA prefixes", () => {
    const akia = detectSensitiveData("Key AKIA1234567890ABCDEF leaked");
    const asia = detectSensitiveData("Key ASIA1234567890ABCDEF leaked");

    expect(akia.some((match) => match.type === "aws_key")).toBe(true);
    expect(asia.some((match) => match.type === "aws_key")).toBe(true);
  });

  it("returns empty array when no PII matches are found", () => {
    const matches = detectSensitiveData(
      "Only regular prose, punctuation, and symbols.",
    );
    expect(matches).toEqual([]);
  });

  it("detects multiple match types in one string with valid ranges", () => {
    const text = [
      "Email me at user@example.com",
      "or call +62 812-3456-7890",
      "from IP 10.20.30.40",
      "using key AKIA1234567890ABCDEF",
    ].join(" ");

    const matches = detectSensitiveData(text);
    const types = new Set(matches.map((match) => match.type));

    expect(types.has("email")).toBe(true);
    expect(types.has("phone_id")).toBe(true);
    expect(types.has("ip_address")).toBe(true);
    expect(types.has("aws_key")).toBe(true);
    expect(matches.every((match) => match.startIndex < match.endIndex)).toBe(
      true,
    );
  });
});
