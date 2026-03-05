import { isIPCResponseEnvelope } from '../../shared/ipc-response';
import { IPCInvokeError } from './ipc-error';

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
  const response = await window.smartpaste.invoke(channel, payload);

  if (isIPCResponseEnvelope<T>(response)) {
    if (!response.ok) {
      throw new IPCInvokeError(response.error);
    }
    return response.data;
  }

  return response as T;
}

export function onIPC<P = unknown>(
  channel: string,
  listener: (payload: P) => void,
): () => void {
  if (!hasSmartPasteBridge()) {
    return () => { };
  }
  return window.smartpaste.on(channel, (_, payload) => listener(payload as P));
}
