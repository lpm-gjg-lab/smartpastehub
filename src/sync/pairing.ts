export interface PairingInfo {
  deviceId: string;
  publicKey: string;
}

export async function generatePairingCode(): Promise<string> {
  return 'PAIR-PLACEHOLDER';
}

export async function confirmPairing(code: string): Promise<PairingInfo> {
  void code;
  return { deviceId: 'device', publicKey: '' };
}
