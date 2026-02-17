export interface MultiClipboard {
  items: string[];
  maxItems: number;
  separator: string;
  isCollecting: boolean;
}

const state: MultiClipboard = {
  items: [],
  maxItems: 10,
  separator: '\n',
  isCollecting: false,
};

export function startCollecting(): void {
  state.items = [];
  state.isCollecting = true;
}

export function addItem(text: string): void {
  if (!state.isCollecting) return;
  if (state.items.length >= state.maxItems) return;
  state.items.push(text);
}

export function mergeAndPaste(separator?: string): string {
  const sep = separator ?? state.separator;
  const merged = state.items.join(sep);
  state.isCollecting = false;
  state.items = [];
  return merged;
}

export function clear(): void {
  state.items = [];
  state.isCollecting = false;
}

export function getMultiClipboard(): MultiClipboard {
  return { ...state, items: [...state.items] };
}
