import { onOffLight } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { OnOffDevice } from './OnOffDevice.js';

class OnOffLight extends OnOffDevice {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(structureSection, platform, OnOffLight.name, 'light', structureSection.states.active, onOffLight);
  }
}

export { OnOffLight };
