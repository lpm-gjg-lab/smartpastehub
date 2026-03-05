import { maskData } from "../../security/data-masker";
import { detectSensitiveData } from "../../security/sensitive-detector";
import { MaskMode, SensitiveMatch } from "../../shared/types";
import { SafeHandle } from "./contracts";
import {
  expectArray,
  expectNumber,
  expectRecord,
  expectString,
  expectStringUnion,
} from "./validation";

function validateSensitiveMatch(
  payload: unknown,
  index: number,
): SensitiveMatch {
  const record = expectRecord(payload, `matches[${index}]`);
  const type = expectStringUnion(record.type, `matches[${index}].type`, [
    "email",
    "phone_id",
    "phone_intl",
    "nik",
    "credit_card",
    "npwp",
    "passport_id",
    "bank_account",
    "ip_address",
    "aws_key",
    "custom",
  ] as const);

  const startIndex = expectNumber(
    record.startIndex,
    `matches[${index}].startIndex`,
    {
      integer: true,
      min: 0,
    },
  );
  const endIndex = expectNumber(record.endIndex, `matches[${index}].endIndex`, {
    integer: true,
    min: 0,
  });
  if (endIndex < startIndex) {
    throw new Error(`matches[${index}].endIndex must be >= startIndex`);
  }

  return {
    type,
    value: expectString(record.value, `matches[${index}].value`, {
      allowEmpty: true,
    }),
    startIndex,
    endIndex,
  };
}

function validateMaskPayload(payload: unknown): {
  mode: MaskMode;
  matches: SensitiveMatch[];
  text: string;
} {
  const record = expectRecord(payload);
  return {
    mode: expectStringUnion(record.mode, "mode", [
      "full",
      "partial",
      "smart",
      "skip",
    ]),
    matches: expectArray(record.matches, "matches", validateSensitiveMatch),
    text: expectString(record.text, "text", { allowEmpty: true }),
  };
}

function validateScanPayload(payload: unknown): { text: string } {
  const record = expectRecord(payload);
  return {
    text: expectString(record.text, "text", { allowEmpty: true }),
  };
}

export function registerSecurityIpc(safeHandle: SafeHandle): void {
  safeHandle(
    "security:mask",
    async (_, payload) => {
      const { mode, matches, text } = payload;
      return maskData(text, matches, mode);
    },
    validateMaskPayload,
  );

  safeHandle(
    "security:scan",
    async (_, payload) => {
      const { text } = payload;
      return detectSensitiveData(text);
    },
    validateScanPayload,
  );
}
