export interface IPCErrorPayload {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface IPCSuccess<T> {
  ok: true;
  data: T;
}

export interface IPCFailure {
  ok: false;
  error: IPCErrorPayload;
}

export type IPCResponseEnvelope<T> = IPCSuccess<T> | IPCFailure;

function hasObjectShape(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isIPCResponseEnvelope<T>(
  value: unknown,
): value is IPCResponseEnvelope<T> {
  if (!hasObjectShape(value) || typeof value.ok !== "boolean") {
    return false;
  }

  if (value.ok) {
    return "data" in value;
  }

  if (!("error" in value) || !hasObjectShape(value.error)) {
    return false;
  }

  return (
    typeof value.error.code === "string" &&
    typeof value.error.message === "string" &&
    typeof value.error.recoverable === "boolean"
  );
}
