export function getAdjacentIndex(
  currentIndex: number,
  itemCount: number,
  key: string,
): number | null {
  if (itemCount <= 0) {
    return null;
  }

  if (key === 'ArrowDown') {
    return Math.min(itemCount - 1, currentIndex + 1);
  }

  if (key === 'ArrowUp') {
    return Math.max(0, currentIndex - 1);
  }

  return null;
}
