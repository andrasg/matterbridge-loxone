import { onOffSwitch } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { OnOffDevice } from './OnOffDevice.js';

class OnOffSwitch extends OnOffDevice {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(structureSection: any, platform: LoxonePlatform) {
    // eslint-disable-next-line prettier/prettier
    super(
      structureSection, 
      platform, 
      OnOffSwitch.name,
      'switch',
      structureSection.states.active,
      onOffSwitch
    );
  }
}

export { OnOffSwitch };
