import type { DeviceHost } from "./DeviceHost.js";
import type { AdditionalConfig, LoxoneDevice } from "./LoxoneDevice.js";
import { RgbwLight } from "./RgbwLight.js";
import { TunableWhiteLight } from "./TunableWhiteLight.js";
import { DimmerLight } from "./DimmerLight.js";
import { OnOffLight } from "./OnOffLight.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";

/**
 * Factory for the `lightoutput` config keyword. The configured UUID refers to a subcontrol
 * (output) of a `LightControllerV2`, e.g. `<UUID>/AI9`. The correct Matter device type is
 * auto-detected from the resolved subcontrol's `type` and (for color pickers) `pickerType`.
 * @param {Control} control The Loxone control for the `lightoutput` config keyword.
 * @param {DeviceHost} host The host the created device talks to.
 * @param {AdditionalConfig} _additionalConfig Additional configuration for the device. Unused.
 *
 * @returns {LoxoneDevice} A `LoxoneDevice` instance of the correct type for the given subcontrol.
 */
export function createLightOutputDevice(
  control: Control,
  host: DeviceHost,
  _additionalConfig: AdditionalConfig,
): LoxoneDevice {
  switch (control.type) {
    case "ColorPickerV2": {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const pickerType = control.structureSection?.details?.pickerType as string | undefined;
      switch (pickerType) {
        case "TunableWhite":
          return new TunableWhiteLight(control, host);
        case "Rgb":
        case "Lumitech":
          return new RgbwLight(control, host);
        default:
          throw new Error(
            `Unsupported ColorPickerV2 pickerType '${pickerType}' for lightoutput on control ${control.uuidAction}`,
          );
      }
    }
    case "Dimmer":
      return new DimmerLight(control, host);
    case "Switch":
      return new OnOffLight(control, host);
    default:
      throw new Error(
        `Unsupported subcontrol type '${control.type}' for lightoutput on control ${control.uuidAction}`,
      );
  }
}
