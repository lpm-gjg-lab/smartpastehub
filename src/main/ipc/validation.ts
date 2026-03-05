export function expectRecord(
  payload: unknown,
  name = "payload",
): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`${name} must be an object`);
  }
  return payload as Record<string, unknown>;
}

export function expectString(
  value: unknown,
  name: string,
  options?: { allowEmpty?: boolean },
): string {
  if (typeof value !== "string") {
    throw new Error(`${name} must be a string`);
  }
  if (!options?.allowEmpty && value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function expectOptionalString(
  value: unknown,
  name: string,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`${name} must be a string`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function expectBoolean(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${name} must be a boolean`);
  }
  return value;
}

export function expectNumber(
  value: unknown,
  name: string,
  options?: { integer?: boolean; min?: number },
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${name} must be a valid number`);
  }
  if (options?.integer && !Number.isInteger(value)) {
    throw new Error(`${name} must be an integer`);
  }
  if (options?.min !== undefined && value < options.min) {
    throw new Error(`${name} must be >= ${options.min}`);
  }
  return value;
}

export function expectStringUnion<T extends string>(
  value: unknown,
  name: string,
  allowed: readonly T[],
): T {
  if (typeof value !== "string") {
    throw new Error(`${name} must be a string`);
  }
  if (!allowed.includes(value as T)) {
    throw new Error(`${name} is invalid`);
  }
  return value as T;
}

export function expectArray<T>(
  value: unknown,
  name: string,
  mapItem: (item: unknown, index: number) => T,
): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }
  return value.map((item, index) => mapItem(item, index));
}
