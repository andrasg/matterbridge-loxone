import { onOffOutlet } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { OnOffDevice } from './OnOffDevice.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

class OnOffOutlet extends OnOffDevice {
  constructor(control: Control, platform: LoxonePlatform) {
    super(control, platform, OnOffOutlet.name, 'outlet', control.structureSection.states.active, onOffOutlet);
  }
}

export { OnOffOutlet };
