export interface SyncStatus {
  connected: boolean;
  devices: { id: string; name: string }[];
}

const status: SyncStatus = { connected: false, devices: [] };

export function getSyncStatus(): SyncStatus {
  return { ...status, devices: [...status.devices] };
}
