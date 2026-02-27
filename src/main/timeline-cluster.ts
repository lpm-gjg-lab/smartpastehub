export interface TimelineEvent {
  ts: number;
  sourceApp?: string;
  contentType?: string;
  chars: number;
}

export interface TimelineCluster {
  id: string;
  startedAt: string;
  endedAt: string;
  items: number;
  topSourceApp?: string;
  topContentType?: string;
}

const events: TimelineEvent[] = [];

export function pushTimelineEvent(event: TimelineEvent): void {
  events.push(event);
  if (events.length > 2000) {
    events.splice(0, events.length - 2000);
  }
}

export function getTimelineClusters(windowMinutes = 20): TimelineCluster[] {
  if (events.length === 0) {
    return [];
  }
  const sorted = [...events].sort((a, b) => a.ts - b.ts);
  const clusters: TimelineCluster[] = [];
  let current: TimelineEvent[] = [];

  for (const event of sorted) {
    const prev = current[current.length - 1];
    if (!prev || event.ts - prev.ts <= windowMinutes * 60_000) {
      current.push(event);
      continue;
    }
    clusters.push(buildCluster(current));
    current = [event];
  }

  if (current.length > 0) {
    clusters.push(buildCluster(current));
  }

  return clusters.reverse();
}

function buildCluster(group: TimelineEvent[]): TimelineCluster {
  const first = group[0]!;
  const last = group[group.length - 1]!;
  const appCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();

  for (const item of group) {
    const app = item.sourceApp ?? "unknown";
    appCounts.set(app, (appCounts.get(app) ?? 0) + 1);
    const type = item.contentType ?? "unknown";
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }

  return {
    id: `${first.ts}-${last.ts}`,
    startedAt: new Date(first.ts).toISOString(),
    endedAt: new Date(last.ts).toISOString(),
    items: group.length,
    topSourceApp: findTop(appCounts),
    topContentType: findTop(typeCounts),
  };
}

function findTop(map: Map<string, number>): string | undefined {
  let topKey: string | undefined;
  let topValue = -1;
  for (const [key, value] of map.entries()) {
    if (value > topValue) {
      topKey = key;
      topValue = value;
    }
  }
  return topKey;
}
