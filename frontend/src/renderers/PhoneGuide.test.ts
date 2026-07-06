import { describe, it, expect } from '@jest/globals';
import { PhoneGuide } from './PhoneGuide';

describe('PhoneGuide', () => {
  describe('getHalfWidth', () => {
    it('returns the default 20:9 reference phone half-width used to derive scroll pan slack', () => {
      const guide = new PhoneGuide();
      // GUIDE_HEIGHT=9.99, aspectRatio=9/20 -> width = 9.99 * 9/20 ~= 4.4955, halfWidth ~= 2.2478
      expect(guide.getHalfWidth()).toBeCloseTo(2.2478, 3);
    });

    it('stays the narrow-axis extent after switching to landscape orientation', () => {
      // getHalfWidth() feeds SceneRenderer's pan-slack math for whichever axis is currently
      // editable (xFocus in portrait, yFocus in landscape) — it must not change when the
      // guide is only rotated for display.
      const guide = new PhoneGuide();
      guide.createGraphics();
      const before = guide.getHalfWidth();
      guide.setOrientation('landscape');
      expect(guide.getHalfWidth()).toBeCloseTo(before, 6);
    });
  });

  describe('setAspectRatio', () => {
    it('recomputes half-width for the new ratio', () => {
      const guide = new PhoneGuide();
      guide.createGraphics();
      guide.setAspectRatio('4:3');
      // GUIDE_HEIGHT=9.99, aspectRatio=3/4 -> width = 9.99 * 3/4 = 7.4925, halfWidth = 3.74625
      expect(guide.getHalfWidth()).toBeCloseTo(3.74625, 5);
    });

    it('redraws the existing graphics object in place rather than creating a new one', () => {
      const guide = new PhoneGuide();
      const graphics = guide.createGraphics();
      guide.setAspectRatio('16:9');
      expect(guide.getGraphics()).toBe(graphics);
    });
  });

  describe('setOrientation', () => {
    it('can be called before createGraphics without throwing', () => {
      const guide = new PhoneGuide();
      expect(() => guide.setOrientation('landscape')).not.toThrow();
    });

    it('redraws the existing graphics object in place rather than creating a new one', () => {
      const guide = new PhoneGuide();
      const graphics = guide.createGraphics();
      guide.setOrientation('landscape');
      expect(guide.getGraphics()).toBe(graphics);
      guide.setOrientation('portrait');
      expect(guide.getGraphics()).toBe(graphics);
    });
  });
});
