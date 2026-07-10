import { Filter, GlProgram, UniformGroup } from 'pixi.js';

/**
 * Per-sprite diagonal wipe filter, a faithful port of the Android app's scene-transition shader
 * (SceneTransitionManager + ShaderProgram.getFragmentShaderCode). Each sprite fades along a
 * diagonal front that sweeps from its top-left to its bottom-right corner:
 *
 *   - direction  1.0 → wipe OUT: the sprite erases starting at its top-left (old scene).
 *   - direction -1.0 → wipe IN:  the sprite reveals starting at its top-left (new scene).
 *
 * Progress runs 0→1 over the transition. Old and new sprites share the same progress, so the
 * region an outgoing sprite has erased is exactly the region an incoming sprite has revealed —
 * producing the diagonal cross-dissolve the wallpaper shows on device.
 *
 * FEATHER matches Android's WIPE_FEATHER (0.8): the soft width of the moving edge.
 */
const FEATHER = 0.8;

// vLocal = aPosition is 0..1 across the sprite's own quad (independent of the texture atlas),
// mirroring Android's vNormalizedPosition. The diagonal is computed from it in the fragment.
const vertex = `
in vec2 aPosition;
out vec2 vTextureCoord;
out vec2 vLocal;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void ) {
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void ) {
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void) {
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
    vLocal = aPosition;
}
`;

// Note: the filter input (uTexture) is premultiplied-alpha, so the fade attenuates the whole
// colour (rgb and a together) rather than only a — this keeps edges from fringing.
const fragment = `
in vec2 vTextureCoord;
in vec2 vLocal;
out vec4 finalColor;

uniform sampler2D uTexture;

// Supplied via the wipeUniforms UniformGroup; Pixi's GL backend binds group members as
// individual uniforms (see the built-in AlphaFilter's uAlpha), so they are declared flat here.
uniform float uProgress;
uniform float uDirection;

const float FEATHER = ${FEATHER.toFixed(1)};

void main(void) {
    vec4 c = texture(uTexture, vTextureCoord);
    float diagonal = (vLocal.x + vLocal.y) * 0.5;
    float wipePos = uProgress * (1.0 + FEATHER) - FEATHER * 0.5;
    float fade = 1.0;
    if (uDirection > 0.5) {
        fade = smoothstep(wipePos - FEATHER * 0.5, wipePos + FEATHER * 0.5, diagonal);
    } else if (uDirection < -0.5) {
        fade = 1.0 - smoothstep(wipePos - FEATHER * 0.5, wipePos + FEATHER * 0.5, diagonal);
    }
    float atten = fade < 0.5 ? fade * 2.0 : 1.0;
    finalColor = c * atten;
}
`;

let glProgram: GlProgram | null = null;

export interface WipeFilterHandle {
  filter: Filter;
  /** Advance the wipe. progress runs 0 (untouched) → 1 (fully wiped). */
  setProgress(progress: number): void;
}

/**
 * Create a wipe filter instance. A single instance can be shared across every sprite that wipes
 * in the same direction, since they all animate on the same progress value.
 * @param direction 1 to wipe out (old scene), -1 to wipe in (new scene)
 */
export function createWipeFilter(direction: 1 | -1): WipeFilterHandle {
  // The GlProgram is stateless and can be reused across every filter instance.
  if (!glProgram) {
    glProgram = GlProgram.from({ vertex, fragment, name: 'scene-wipe' });
  }

  const uniforms = new UniformGroup({
    uProgress: { value: 0, type: 'f32' },
    uDirection: { value: direction, type: 'f32' },
  });

  const filter = new Filter({
    glProgram,
    resources: { wipeUniforms: uniforms },
    // Keep the filter region tight to the sprite so vLocal spans exactly 0..1 across it.
    padding: 0,
    antialias: 'off',
    // Match the canvas' devicePixelRatio (SceneRenderer inits the app at that resolution) so a
    // sprite looks identical the instant the wipe filter is applied — no softening at progress 0.
    resolution: (typeof window !== 'undefined' && window.devicePixelRatio) || 1,
  });

  return {
    filter,
    setProgress(progress: number) {
      uniforms.uniforms.uProgress = progress;
    },
  };
}
