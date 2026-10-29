import { describe, expect, it } from 'vitest';
import { positionReviewMenu } from '../src/menu-position.js';

describe('review menu viewport positioning', () => {
  it('opens below when space is available', () => {
    const result = positionReviewMenu({ top: 100, bottom: 138, right: 500 }, 212, 140, 1000, 800);
    expect(result.left).toBe(288);
    expect(result.top).toBe(144);
  });
  it('opens above near the bottom edge', () => {
    const result = positionReviewMenu({ top: 650, bottom: 688, right: 500 }, 212, 140, 1000, 720);
    expect(result.top).toBe(504);
  });
  it('keeps menus inside the left and right viewport edges', () => {
    expect(positionReviewMenu({ top: 100, bottom: 138, right: 40 }, 212, 140, 320, 600).left).toBe(8);
    expect(positionReviewMenu({ top: 100, bottom: 138, right: 400 }, 212, 140, 320, 600).left).toBe(100);
  });
  it('limits height to the available space on short screens', () => {
    const result = positionReviewMenu({ top: 90, bottom: 128, right: 280 }, 212, 200, 320, 240);
    expect(result.top + result.maxHeight).toBe(232);
    expect(result.maxHeight).toBe(98);
  });
});
