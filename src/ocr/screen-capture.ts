import { desktopCapturer, nativeImage, screen } from "electron";

export interface CaptureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function captureRegion(region?: CaptureRegion): Promise<Buffer> {
  const display = screen.getPrimaryDisplay();
  const sourceSize = display.size;
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: {
      width: sourceSize.width,
      height: sourceSize.height,
    },
    fetchWindowIcons: false,
  });

  if (sources.length === 0) {
    throw new Error("No screen source available for OCR capture");
  }

  const primarySource =
    sources.find((source) => source.display_id === String(display.id)) ??
    sources[0];
  if (!primarySource) {
    throw new Error("Primary screen source was not found");
  }

  let image = primarySource.thumbnail;
  if (image.isEmpty()) {
    throw new Error("Captured screenshot is empty");
  }

  if (region) {
    const size = image.getSize();
    const x = Math.max(0, Math.floor(region.x));
    const y = Math.max(0, Math.floor(region.y));
    const width = Math.max(1, Math.floor(region.width));
    const height = Math.max(1, Math.floor(region.height));

    if (x >= size.width || y >= size.height) {
      throw new Error("Capture region is outside screenshot bounds");
    }

    const boundedWidth = Math.min(width, size.width - x);
    const boundedHeight = Math.min(height, size.height - y);
    image = nativeImage.createFromBuffer(image.toPNG()).crop({
      x,
      y,
      width: boundedWidth,
      height: boundedHeight,
    });
  }

  const png = image.toPNG();
  if (png.length === 0) {
    throw new Error("Failed to encode captured screenshot");
  }

  return png;
}
