import { onOffOutlet } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { OnOffDevice } from './OnOffDevice.js';

class OnOffOutlet extends OnOffDevice {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(structureSection, platform, OnOffOutlet.name, 'outlet', structureSection.states.active, onOffOutlet);
  }
}

export { OnOffOutlet };
