import { onOffLight } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { OnOffDevice } from './OnOffDevice.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';
import { RegisterLoxoneDevice } from './LoxoneDevice.js';

class OnOffLight extends OnOffDevice {
  constructor(control: Control, platform: LoxonePlatform) {
    super(control, platform, OnOffLight.name, 'light', onOffLight);
  }

  static override typeNames(): string[] {
    return ['light'];
  }
}

RegisterLoxoneDevice(OnOffLight);

export { OnOffLight };
