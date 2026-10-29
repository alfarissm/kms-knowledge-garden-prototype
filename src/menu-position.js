// Position a menu beside its trigger, without escaping the viewport.
export function positionReviewMenu(trigger, width, height, viewportWidth, viewportHeight) {
  const margin = 8;
  const gap = 6;
  const below = Math.max(0, viewportHeight - trigger.bottom - gap - margin);
  const above = Math.max(0, trigger.top - gap - margin);
  const openAbove = height > below && above > below;
  const maxHeight = openAbove ? above : below;
  const actualHeight = Math.min(height, maxHeight);
  const left = Math.max(margin, Math.min(trigger.right - width, viewportWidth - width - margin));
  const top = openAbove ? trigger.top - gap - actualHeight : trigger.bottom + gap;
  return { left, top, maxHeight };
}
