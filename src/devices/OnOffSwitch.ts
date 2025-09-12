import { onOffSwitch } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { OnOffDevice } from './OnOffDevice.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

class OnOffSwitch extends OnOffDevice {
  constructor(control: Control, platform: LoxonePlatform) {
    super(control, platform, OnOffSwitch.name, 'switch', onOffSwitch);
  }
}

export { OnOffSwitch };
