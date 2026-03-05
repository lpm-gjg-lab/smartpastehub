const SUPABASE_URL = process.env.SMARTPASTE_TELEMETRY_URL || "";
const SUPABASE_ANON_KEY = process.env.SMARTPASTE_TELEMETRY_KEY || "";
const CACHE_TTL_MS = 60_000;

type StatsResponse = {
  total_devices: number;
  total_pastes: number;
  total_chars_cleaned: number;
  total_ocr: number;
  total_ai_rewrites: number;
  total_translates: number;
  updated_at: string;
};

let cachedStats: StatsResponse | null = null;
let cachedAt = 0;

function withCorsHeaders(headers: HeadersInit = {}): Headers {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  responseHeaders.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, apikey",
  );
  responseHeaders.set("Cache-Control", "public, max-age=60");
  return responseHeaders;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }
  return 0;
}

function emptyStats(): StatsResponse {
  return {
    total_devices: 0,
    total_pastes: 0,
    total_chars_cleaned: 0,
    total_ocr: 0,
    total_ai_rewrites: 0,
    total_translates: 0,
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: withCorsHeaders(),
    });
  }

  if (request.method !== "GET") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: withCorsHeaders(),
    });
  }

  const now = Date.now();
  if (cachedStats && now - cachedAt < CACHE_TTL_MS) {
    return new Response(JSON.stringify(cachedStats), {
      status: 200,
      headers: withCorsHeaders({ "Content-Type": "application/json" }),
    });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const fallback = emptyStats();
    cachedStats = fallback;
    cachedAt = now;
    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: withCorsHeaders({ "Content-Type": "application/json" }),
    });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/telemetry_lifetime?select=total_devices,total_pastes,total_chars_cleaned,total_ocr,total_ai_rewrites,total_translates&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch lifetime stats");
    }

    const rows: Array<Record<string, unknown>> = await response.json();
    const row = rows[0] ?? {};
    const stats: StatsResponse = {
      total_devices: toNumber(row.total_devices),
      total_pastes: toNumber(row.total_pastes),
      total_chars_cleaned: toNumber(row.total_chars_cleaned),
      total_ocr: toNumber(row.total_ocr),
      total_ai_rewrites: toNumber(row.total_ai_rewrites),
      total_translates: toNumber(row.total_translates),
      updated_at: new Date().toISOString(),
    };

    cachedStats = stats;
    cachedAt = now;

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: withCorsHeaders({ "Content-Type": "application/json" }),
    });
  } catch {
    const fallback = emptyStats();
    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: withCorsHeaders({ "Content-Type": "application/json" }),
    });
  }
}
