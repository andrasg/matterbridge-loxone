import { LoxonePlatform } from '../LoxonePlatform.js';
import { AdditionalConfig, LoxoneDevice } from './LoxoneDevice.js';
import { RgbwLight } from './RgbwLight.js';
import { TunableWhiteLight } from './TunableWhiteLight.js';
import { DimmerLight } from './DimmerLight.js';
import { OnOffLight } from './OnOffLight.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

/**
 * Factory for the `lightoutput` config keyword. The configured UUID refers to a subcontrol
 * (output) of a `LightControllerV2`, e.g. `<UUID>/AI9`. The correct Matter device type is
 * auto-detected from the resolved subcontrol's `type` and (for color pickers) `pickerType`.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createLightOutputDevice(control: Control, platform: LoxonePlatform, additionalConfig: AdditionalConfig): LoxoneDevice {
  switch (control.type) {
    case 'ColorPickerV2': {
      const pickerType = control.structureSection?.details?.pickerType as string | undefined;
      switch (pickerType) {
        case 'TunableWhite':
          return new TunableWhiteLight(control, platform);
        case 'Rgb':
        case 'Lumitech':
          return new RgbwLight(control, platform);
        default:
          throw new Error(`Unsupported ColorPickerV2 pickerType '${pickerType}' for lightoutput on control ${control.uuidAction}`);
      }
    }
    case 'Dimmer':
      return new DimmerLight(control, platform);
    case 'Switch':
      return new OnOffLight(control, platform);
    default:
      throw new Error(`Unsupported subcontrol type '${control.type}' for lightoutput on control ${control.uuidAction}`);
  }
}
