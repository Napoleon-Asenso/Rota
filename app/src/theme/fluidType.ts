import { Platform, TextStyle, useWindowDimensions } from 'react-native';

/** Viewport range (px) over which fluid values interpolate; values are clamped outside it. */
const FLUID_MIN_VIEWPORT = 320;
const FLUID_MAX_VIEWPORT = 768;
const ROOT_FONT_SIZE = 16;

/** A value at the narrowest viewport (`narrow`) and at the widest viewport (`wide`). */
export interface FluidRange {
  narrow: number;
  wide: number;
}

export interface FluidTypeSpec {
  /** Font size in px. */
  fontSize: FluidRange;
  /** Unitless line-height multiplier. */
  lineHeight: number;
  /**
   * Tracking in em. Display text is tightened on wide screens but relaxed toward
   * neutral on narrow screens so glyphs never collide when the font shrinks.
   */
  letterSpacingEm: FluidRange;
}

export type FluidPreset = 'hero' | 'display' | 'heading' | 'subheading' | 'lead';

export const fluidTypeScale: Record<FluidPreset, FluidTypeSpec> = {
  hero: { fontSize: { narrow: 28, wide: 44 }, lineHeight: 1.15, letterSpacingEm: { narrow: -0.004, wide: -0.022 } },
  display: { fontSize: { narrow: 26, wide: 36 }, lineHeight: 1.18, letterSpacingEm: { narrow: -0.004, wide: -0.02 } },
  heading: { fontSize: { narrow: 24, wide: 30 }, lineHeight: 1.22, letterSpacingEm: { narrow: 0, wide: -0.014 } },
  subheading: { fontSize: { narrow: 20, wide: 24 }, lineHeight: 1.28, letterSpacingEm: { narrow: 0.002, wide: -0.008 } },
  lead: { fontSize: { narrow: 15, wide: 17 }, lineHeight: 1.5, letterSpacingEm: { narrow: 0.008, wide: 0 } }
};

function toRem(px: number): string {
  return `${Number((px / ROOT_FONT_SIZE).toFixed(4))}rem`;
}

/**
 * Builds `clamp(min, calc(intercept + slope·vw), max)` from a narrow→wide range.
 * slope = Δvalue / Δviewport; intercept = narrow − slope·minViewport.
 * Bounds are ordered because ranges may decrease with width (e.g. negative tracking).
 */
export function toCssClamp(range: FluidRange): string {
  const slope = (range.wide - range.narrow) / (FLUID_MAX_VIEWPORT - FLUID_MIN_VIEWPORT);
  const intercept = range.narrow - slope * FLUID_MIN_VIEWPORT;
  const lower = Math.min(range.narrow, range.wide);
  const upper = Math.max(range.narrow, range.wide);
  const vw = Number((slope * 100).toFixed(4));
  return `clamp(${toRem(lower)}, calc(${toRem(intercept)} + ${vw}vw), ${toRem(upper)})`;
}

/** Native equivalent of {@link toCssClamp} for a given window width. */
export function resolveFluidValue(range: FluidRange, viewportWidth: number): number {
  const progress = Math.min(
    Math.max((viewportWidth - FLUID_MIN_VIEWPORT) / (FLUID_MAX_VIEWPORT - FLUID_MIN_VIEWPORT), 0),
    1
  );
  return range.narrow + (range.wide - range.narrow) * progress;
}

/** Converts em tracking into px at each end of the font-size range so it can be clamped linearly. */
function letterSpacingPxRange(spec: FluidTypeSpec): FluidRange {
  return {
    narrow: spec.letterSpacingEm.narrow * spec.fontSize.narrow,
    wide: spec.letterSpacingEm.wide * spec.fontSize.wide
  };
}

export function useFluidTextStyle(preset: FluidPreset | undefined): TextStyle | undefined {
  const { width } = useWindowDimensions();
  if (!preset) return undefined;

  const spec = fluidTypeScale[preset];

  if (Platform.OS === 'web') {
    // react-native-web forwards string values verbatim to CSS, enabling native clamp();
    // React Native's TextStyle typings only declare numbers for these properties.
    const webStyle = {
      fontSize: toCssClamp(spec.fontSize),
      lineHeight: String(spec.lineHeight),
      letterSpacing: toCssClamp(letterSpacingPxRange(spec))
    };
    return webStyle as unknown as TextStyle;
  }

  const fontSize = resolveFluidValue(spec.fontSize, width);
  return {
    fontSize,
    lineHeight: Math.round(fontSize * spec.lineHeight),
    letterSpacing: Number(resolveFluidValue(letterSpacingPxRange(spec), width).toFixed(2))
  };
}
