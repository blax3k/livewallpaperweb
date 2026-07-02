import { describe, it, expect } from '@jest/globals';
import { PhoneGuide } from './PhoneGuide';

describe('PhoneGuide', () => {
  describe('getHalfWidth', () => {
    it('returns the 21:9 reference phone half-width used to derive scroll pan slack', () => {
      const guide = new PhoneGuide();
      // GUIDE_HEIGHT=9.99, ASPECT_RATIO=9/21 -> width = 9.99 * 9/21 ~= 4.2814, halfWidth ~= 2.1407
      expect(guide.getHalfWidth()).toBeCloseTo(2.1407, 3);
    });
  });
});
