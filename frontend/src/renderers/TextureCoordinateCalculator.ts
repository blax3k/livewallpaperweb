/**
 * Ported from Android's TextureCoordinateCalculator.java.
 *
 * Texture coordinate array layout (matches buildTextureCoordinateArray in the Android app):
 *   [uMin, vMax, uMin, vMin, uMax, vMax, uMax, vMin]
 *   idx:    0     1     2     3     4     5     6     7
 *
 * The web SceneRenderer reads:
 *   minU = min(indices 0,2,4,6), maxU = max(...)
 *   minV = min(indices 1,3,5,7), maxV = max(...)
 *
 * textureScale: ≥ 1.0. 1.0 = texture just covers sprite (minimum zoom).
 *               Larger values zoom in (show less of the texture).
 * offsetU/V:   UV-space displacement of the texture window center from the
 *              original tex-coord center. Start at 0 when entering the editor.
 */

export interface TexCoordWindow {
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
  windowSizeU: number;
  windowSizeV: number;
}

function getNaturalTexSize(
  originalTexCoords: number[],
  originalWidth: number,
  originalHeight: number,
): { naturalTexW: number; naturalTexH: number } {
  if (originalTexCoords.length >= 8) {
    const initWindowU = Math.abs(originalTexCoords[4] - originalTexCoords[0]);
    const initWindowV = Math.abs(originalTexCoords[1] - originalTexCoords[3]);
    return {
      naturalTexW: initWindowU > 0.001 ? originalWidth / initWindowU : originalWidth,
      naturalTexH: initWindowV > 0.001 ? originalHeight / initWindowV : originalHeight,
    };
  }
  return { naturalTexW: originalWidth, naturalTexH: originalHeight };
}

/**
 * Compute the UV window given the current editing state.
 *
 * @param originalTexCoords  8-float UV coords at the time the editor was opened (frozen reference)
 * @param textureScale       user zoom ≥ 1.0
 * @param width              current sprite world width
 * @param height             current sprite world height
 * @param originalWidth      sprite width at time editor was opened (baseline)
 * @param originalHeight     sprite height at time editor was opened (baseline)
 * @param offsetU            cumulative UV pan offset (U axis)
 * @param offsetV            cumulative UV pan offset (V axis)
 */
export function calculateTexCoords(
  originalTexCoords: number[],
  textureScale: number,
  width: number,
  height: number,
  originalWidth: number,
  originalHeight: number,
  offsetU: number,
  offsetV: number,
): TexCoordWindow {
  const { naturalTexW, naturalTexH } = getNaturalTexSize(originalTexCoords, originalWidth, originalHeight);

  const minScaleForCoverage = Math.max(width / naturalTexW, height / naturalTexH);
  const effectiveScale = minScaleForCoverage * textureScale;

  const windowSizeU = Math.min(1.0, width / (naturalTexW * effectiveScale));
  const windowSizeV = Math.min(1.0, height / (naturalTexH * effectiveScale));

  const halfU = windowSizeU * 0.5;
  const halfV = windowSizeV * 0.5;

  // Base center from the original UV window, pan offset applied on top
  let baseCenterU = 0.5;
  let baseCenterV = 0.5;
  if (originalTexCoords.length >= 8) {
    baseCenterU = (originalTexCoords[0] + originalTexCoords[4]) * 0.5;
    baseCenterV = (originalTexCoords[3] + originalTexCoords[1]) * 0.5;
  }

  const centerU = Math.max(halfU, Math.min(1 - halfU, baseCenterU + offsetU));
  const centerV = Math.max(halfV, Math.min(1 - halfV, baseCenterV + offsetV));

  return {
    uMin: centerU - halfU,
    uMax: centerU + halfU,
    vMin: centerV - halfV,
    vMax: centerV + halfV,
    windowSizeU,
    windowSizeV,
  };
}

/**
 * Assemble the 8-float tex coord array from a TexCoordWindow.
 * Format: [uMin, vMax, uMin, vMin, uMax, vMax, uMax, vMin]
 */
export function buildTexCoordArray(w: TexCoordWindow): number[] {
  return [w.uMin, w.vMax, w.uMin, w.vMin, w.uMax, w.vMax, w.uMax, w.vMin];
}

/**
 * Clamp a proposed pan delta so the UV window stays within [0,1].
 * Returns the new [offsetU, offsetV] after applying and clamping.
 */
export function clampTexOffset(
  currentOffsetU: number,
  currentOffsetV: number,
  deltaU: number,
  deltaV: number,
  width: number,
  height: number,
  originalWidth: number,
  originalHeight: number,
  textureScale: number,
  originalTexCoords: number[],
): [number, number] {
  const { naturalTexW, naturalTexH } = getNaturalTexSize(originalTexCoords, originalWidth, originalHeight);

  const minScaleForCoverage = Math.max(width / naturalTexW, height / naturalTexH);
  const effectiveScale = minScaleForCoverage * textureScale;

  const windowSizeU = Math.min(1.0, width / (naturalTexW * effectiveScale));
  const windowSizeV = Math.min(1.0, height / (naturalTexH * effectiveScale));

  const halfU = windowSizeU * 0.5;
  const halfV = windowSizeV * 0.5;

  let baseCenterU = 0.5;
  let baseCenterV = 0.5;
  if (originalTexCoords.length >= 8) {
    baseCenterU = (originalTexCoords[0] + originalTexCoords[4]) * 0.5;
    baseCenterV = (originalTexCoords[3] + originalTexCoords[1]) * 0.5;
  }

  const newCenterU = Math.max(halfU, Math.min(1 - halfU, baseCenterU + currentOffsetU + deltaU));
  const newCenterV = Math.max(halfV, Math.min(1 - halfV, baseCenterV + currentOffsetV + deltaV));

  return [newCenterU - baseCenterU, newCenterV - baseCenterV];
}

/**
 * Extract a reasonable initial textureScale from existing UV coords.
 * textureScale=1.0 means the texture just covers the sprite; the existing
 * coords may encode a zoom > 1.0 if the window is smaller than the full texture.
 */
export function extractInitialScale(texCoords: number[]): number {
  if (texCoords.length < 8) return 1.0;
  const windowU = Math.abs(texCoords[4] - texCoords[0]);
  const windowV = Math.abs(texCoords[1] - texCoords[3]);
  const maxWindow = Math.max(windowU, windowV);
  const scale = maxWindow > 0.001 ? 1.0 / maxWindow : 1.0;
  return Math.max(1.0, Math.min(8.0, scale));
}
