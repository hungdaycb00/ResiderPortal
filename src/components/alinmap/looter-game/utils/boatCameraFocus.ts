export type BoatCameraOffsets = {
  xOffset: number;
  yOffset: number;
};

export function getVisibleBoatCameraOffsets(): BoatCameraOffsets {
  const backpack = document.getElementById('looter-backpack-container');
  const rect = backpack?.getBoundingClientRect();
  if (!rect) return { xOffset: 0, yOffset: 0 };

  const isDesktopSidePanel =
    window.innerWidth >= 768 &&
    rect.left < window.innerWidth * 0.35 &&
    rect.width < window.innerWidth * 0.8 &&
    rect.height > window.innerHeight * 0.55;

  if (isDesktopSidePanel) {
    const visibleLeft = Math.min(Math.max(rect.right, 0), window.innerWidth);
    const visibleCenterX = (visibleLeft + window.innerWidth) / 2;
    return { xOffset: visibleCenterX - window.innerWidth / 2, yOffset: 0 };
  }

  const visibleMapHeight = Math.max(120, Math.min(rect.top, window.innerHeight));
  const visibleCenterY = visibleMapHeight / 2;
  return { xOffset: 0, yOffset: window.innerHeight / 2 - visibleCenterY };
}
