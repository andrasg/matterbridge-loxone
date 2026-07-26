import type LoxoneTextEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js";

export type LoxoneColorKind = "hsv" | "temp";

/**
 * Parses and converts the text value of a Loxone `ColorPickerV2` `color` state.
 *
 * The text is formatted either as:
 * - `hsv(<hue 0-360>,<saturation 0-100>,<brightness 0-100>)`
 * - `temp(<brightness 0-100>,<kelvin>)`
 */
class ColorInfo {
  kind: LoxoneColorKind | undefined;
  /** Loxone hue 0-360 (only for `hsv`). */
  hue = 0;
  /** Loxone saturation 0-100 (only for `hsv`). */
  saturation = 0;
  /** Loxone brightness 0-100. */
  brightness = 0;
  /** Color temperature in Kelvin (only for `temp`). */
  kelvin = 0;

  static fromText(text: string | undefined): ColorInfo | undefined {
    if (text === undefined) return undefined;

    const info = new ColorInfo();
    const trimmed = text.trim();

    const hsvMatch = /^hsv\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i.exec(trimmed);
    if (hsvMatch) {
      info.kind = "hsv";
      info.hue = Number(hsvMatch[1]);
      info.saturation = Number(hsvMatch[2]);
      info.brightness = Number(hsvMatch[3]);
      return info;
    }

    const tempMatch = /^temp\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i.exec(trimmed);
    if (tempMatch) {
      info.kind = "temp";
      info.brightness = Number(tempMatch[1]);
      info.kelvin = Number(tempMatch[2]);
      return info;
    }

    return undefined;
  }

  static fromEvent(event: LoxoneTextEvent | undefined): ColorInfo | undefined {
    return ColorInfo.fromText(event?.text);
  }
}

/** Converts a Loxone hue (0-360) to a Matter hue (0-254). */
export function loxoneHueToMatter(hue: number): number {
  return clamp(Math.round((hue * 254) / 360), 0, 254);
}

/** Converts a Matter hue (0-254) to a Loxone hue (0-360). */
export function matterHueToLoxone(hue: number): number {
  return clamp(Math.round((hue * 360) / 254), 0, 360);
}

/** Converts a Loxone saturation (0-100) to a Matter saturation (0-254). */
export function loxoneSaturationToMatter(saturation: number): number {
  return clamp(Math.round((saturation * 254) / 100), 0, 254);
}

/** Converts a Matter saturation (0-254) to a Loxone saturation (0-100). */
export function matterSaturationToLoxone(saturation: number): number {
  return clamp(Math.round((saturation * 100) / 254), 0, 100);
}

/** Converts Kelvin to Matter color temperature in mireds. */
export function kelvinToMireds(kelvin: number): number {
  if (!Number.isFinite(kelvin) || kelvin <= 0) return 0;
  return Math.round(1_000_000 / kelvin);
}

/** Converts Matter color temperature in mireds to Kelvin. */
export function miredsToKelvin(mireds: number): number {
  if (!Number.isFinite(mireds) || mireds <= 0) return 0;
  return Math.round(1_000_000 / mireds);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export { ColorInfo };
