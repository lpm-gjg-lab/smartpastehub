export interface SyncMessage {
  type: 'register' | 'pair' | 'clipboard' | 'ack' | 'ping';
  deviceId: string;
  targetDeviceId?: string;
  payload: string;
  nonce: string;
  timestamp: number;
}

export function createRelayMessage(type: SyncMessage['type'], deviceId: string, payload: string, nonce: string): SyncMessage {
  return {
    type,
    deviceId,
    payload,
    nonce,
    timestamp: Date.now(),
  };
}
