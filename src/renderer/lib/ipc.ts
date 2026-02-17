export function hasSmartPasteBridge(): boolean {
  return (
    typeof window !== 'undefined' && typeof window.smartpaste !== 'undefined'
  );
}

export async function invokeIPC<T>(
  channel: string,
  payload?: unknown,
): Promise<T> {
  if (!hasSmartPasteBridge()) {
    throw new Error(
      'Smart Paste bridge is not available. Run inside Electron app.',
    );
  }
  return (await window.smartpaste.invoke(channel, payload)) as T;
}

export function onIPC(
  channel: string,
  listener: (payload: unknown) => void,
): void {
  if (!hasSmartPasteBridge()) {
    return;
  }
  window.smartpaste.on(channel, (_, payload) => listener(payload));
}
