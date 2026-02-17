const queue: string[] = [];

export function enqueue(text: string): void {
  queue.push(text);
}

export function dequeue(): string | null {
  return queue.shift() ?? null;
}

export function peek(): string | null {
  return queue[0] ?? null;
}

export function size(): number {
  return queue.length;
}

export function clearQueue(): void {
  queue.length = 0;
}
