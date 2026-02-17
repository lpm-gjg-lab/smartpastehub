export interface CaptureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function captureRegion(region?: CaptureRegion): Promise<Buffer> {
  void region;
  return Buffer.from('');
}
