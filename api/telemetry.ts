// This is a Vercel serverless function.
// Deploy separately or in a companion repo.
// Reference implementation with basic validation and in-memory rate limiting.

const SUPABASE_URL = process.env.SMARTPASTE_TELEMETRY_URL || "";
const SUPABASE_ANON_KEY = process.env.SMARTPASTE_TELEMETRY_KEY || "";
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const rateLimitStore = new Map<
  string,
  { count: number; windowStart: number }
>();

type TelemetryEvent = {
  device_id: string;
  app_version: string;
  os_version: string;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}

function isRateLimited(clientIp: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(clientIp);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(clientIp, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  entry.count += 1;
  rateLimitStore.set(clientIp, entry);
  return false;
}

function isValidEvent(value: unknown): value is TelemetryEvent {
  if (!value || typeof value !== "object") {
    return false;
  }
  const event = value as TelemetryEvent;
  return (
    typeof event.device_id === "string" &&
    typeof event.app_version === "string" &&
    typeof event.os_version === "string" &&
    typeof event.event_type === "string" &&
    event.metadata !== null &&
    typeof event.metadata === "object" &&
    typeof event.created_at === "string"
  );
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response("Telemetry disabled", { status: 204 });
  }

  const clientIp = getClientIp(request);
  if (isRateLimited(clientIp)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!Array.isArray(payload) || payload.length === 0 || payload.length > 100) {
    return new Response("Invalid payload", { status: 400 });
  }

  if (!payload.every((event) => isValidEvent(event))) {
    return new Response("Invalid event payload", { status: 400 });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/telemetry_events`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return new Response("Upstream insert failed", { status: 502 });
    }

    return new Response(null, { status: 202 });
  } catch {
    return new Response("Proxy failed", { status: 502 });
  }
}
