export interface ObservabilityEvent {
  ts: string;
  app?: string;
  kind:
    | "transform"
    | "fallback"
    | "policy"
    | "preview"
    | "undo"
    | "recipe"
    | "learn"
    | "timeline";
  detail: string;
  metadata?: Record<string, unknown>;
}

const eventRing: ObservabilityEvent[] = [];

export function pushObservabilityEvent(
  event: ObservabilityEvent,
  maxEvents = 500,
): void {
  eventRing.push(event);
  if (eventRing.length > maxEvents) {
    eventRing.splice(0, eventRing.length - maxEvents);
  }
}

export function listObservabilityEvents(limit = 200): ObservabilityEvent[] {
  if (limit <= 0) {
    return [];
  }
  return eventRing.slice(-limit).reverse();
}
