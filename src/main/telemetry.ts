import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import os from "os";
import { updateSettings } from "./settings-store";
import { AppSettings } from "../shared/types";

const SUPABASE_URL = process.env.SMARTPASTE_TELEMETRY_URL || "";
const SUPABASE_ANON_KEY = process.env.SMARTPASTE_TELEMETRY_KEY || "";
const FLUSH_INTERVAL_MS = 5 * 60 * 1000;
const FLUSH_BATCH_SIZE = 50;
const DEFAULT_MAX_EVENTS = 500;

export type TelemetryEventType =
  | "paste"
  | "ocr"
  | "ai_rewrite"
  | "translate"
  | "multi_copy"
  | "ghost_write"
  | "app_start"
  | "app_quit"
  | "app_error"
  | "daily_summary";

interface TelemetryEvent {
  device_id: string;
  app_version: string;
  os_version: string;
  event_type: TelemetryEventType;
  metadata: Record<string, unknown>;
  created_at: string;
}

let currentSettings: AppSettings | null = null;
let telemetryQueue: TelemetryEvent[] = [];
let flushTimer: NodeJS.Timeout | null = null;
let flushPromise: Promise<void> | null = null;
let deviceId = "";
let appVersion = "0.0.0";
let client: SupabaseClient | null = null;

function isEnabled(): boolean {
  const observabilityEnabled =
    currentSettings?.diagnostics?.observabilityEnabled ?? false; // default OFF — user must opt-in
  if (!observabilityEnabled) {
    return false;
  }
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function getClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return client;
}

async function ensureDeviceId(settings: AppSettings): Promise<string> {
  const existing = settings.diagnostics?.telemetryDeviceId?.trim() ?? "";
  if (existing) {
    return existing;
  }

  const generated = randomUUID();
  deviceId = generated;
  try {
    const updated = await updateSettings({
      diagnostics: {
        observabilityEnabled:
          settings.diagnostics?.observabilityEnabled ?? true,
        maxEvents: settings.diagnostics?.maxEvents ?? DEFAULT_MAX_EVENTS,
        telemetryDeviceId: generated,
      },
    });
    currentSettings = updated;
  } catch {
    // Silent by design.
  }

  return generated;
}

function startFlushTimer(): void {
  if (flushTimer) {
    return;
  }
  flushTimer = setInterval(() => {
    maybeEmitDailySummary();
    void flush();
  }, FLUSH_INTERVAL_MS);
  flushTimer.unref();
}

// Daily summary tracking
let lastSummaryDate = "";
const sessionCounts = new Map<string, number>();

function maybeEmitDailySummary(): void {
  const today = new Date().toISOString().slice(0, 10);
  if (lastSummaryDate === today || sessionCounts.size === 0) {
    return;
  }
  lastSummaryDate = today;
  const counts: Record<string, number> = {};
  for (const [key, val] of sessionCounts) {
    counts[key] = val;
  }
  sessionCounts.clear();
  queueEvent({
    device_id: deviceId,
    app_version: appVersion,
    os_version: `${process.platform} ${os.release()}`,
    event_type: "daily_summary",
    metadata: { counts, date: today },
    created_at: new Date().toISOString(),
  });
}

function queueEvent(event: TelemetryEvent): void {
  const maxEvents =
    currentSettings?.diagnostics?.maxEvents ?? DEFAULT_MAX_EVENTS;
  telemetryQueue.push(event);
  if (telemetryQueue.length > maxEvents) {
    telemetryQueue = telemetryQueue.slice(telemetryQueue.length - maxEvents);
  }
}

function splitIntoBatches(events: TelemetryEvent[]): TelemetryEvent[][] {
  const batches: TelemetryEvent[][] = [];
  for (let index = 0; index < events.length; index += FLUSH_BATCH_SIZE) {
    batches.push(events.slice(index, index + FLUSH_BATCH_SIZE));
  }
  return batches;
}

function init(settings: AppSettings, nextAppVersion = "0.0.0"): void {
  currentSettings = settings;
  appVersion = nextAppVersion;
  deviceId = settings.diagnostics?.telemetryDeviceId?.trim() ?? "";
  startFlushTimer();
  void ensureDeviceId(settings)
    .then((id) => {
      deviceId = id;
    })
    .catch(() => {
      // Silent by design.
    });
}

function track(
  eventType: TelemetryEventType,
  metadata: Record<string, unknown> = {},
): void {
  if (!isEnabled()) {
    return;
  }

  if (!deviceId) {
    return;
  }

  // Track counts for daily summary
  if (eventType !== "daily_summary") {
    sessionCounts.set(eventType, (sessionCounts.get(eventType) ?? 0) + 1);
  }

  queueEvent({
    device_id: deviceId,
    app_version: appVersion,
    os_version: `${process.platform} ${os.release()}`,
    event_type: eventType,
    metadata,
    created_at: new Date().toISOString(),
  });

  if (telemetryQueue.length >= FLUSH_BATCH_SIZE) {
    void flush();
  }
}

async function flush(): Promise<void> {
  if (!isEnabled() || telemetryQueue.length === 0) {
    return;
  }

  if (flushPromise) {
    return flushPromise;
  }

  const pending = telemetryQueue;
  telemetryQueue = [];

  flushPromise = (async () => {
    const supabase = getClient();
    if (!supabase) {
      return;
    }

    try {
      const batches = splitIntoBatches(pending);
      for (const batch of batches) {
        const { error } = await supabase.from("telemetry_events").insert(batch);
        if (error) {
          throw error;
        }
      }
    } catch {
      telemetryQueue = [...pending, ...telemetryQueue];
      const maxEvents =
        currentSettings?.diagnostics?.maxEvents ?? DEFAULT_MAX_EVENTS;
      if (telemetryQueue.length > maxEvents) {
        telemetryQueue = telemetryQueue.slice(
          telemetryQueue.length - maxEvents,
        );
      }
    }
  })();

  try {
    await flushPromise;
  } finally {
    flushPromise = null;
  }
}

export const telemetry = { track, flush, init };
