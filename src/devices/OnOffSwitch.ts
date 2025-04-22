import { onOffSwitch } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { OnOffDevice } from './OnOffDevice.js';

class OnOffSwitch extends OnOffDevice {
  constructor(structureSection: any, platform: LoxonePlatform) {
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
