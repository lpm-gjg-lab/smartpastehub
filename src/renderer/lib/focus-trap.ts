export function getFocusCycleIndex(
  currentIndex: number,
  itemCount: number,
  shiftKey: boolean,
): number {
  if (itemCount <= 0) {
    return -1;
  }

  if (shiftKey) {
    return currentIndex <= 0 ? itemCount - 1 : currentIndex - 1;
  }

  return currentIndex >= itemCount - 1 ? 0 : currentIndex + 1;
}
