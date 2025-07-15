import { bridgedNode, powerSource, genericSwitch } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';

class PushButton extends LoxoneDevice {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      [genericSwitch, bridgedNode, powerSource],
      [structureSection.states.active],
      'button',
      `${genericSwitch.name}_${structureSection.uuidAction.replace(/-/g, '_')}`,
    );

    this.Endpoint.createDefaultGroupsClusterServer().createDefaultSwitchClusterServer();
  }

  override async handleLoxoneDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    if (event.value === 1) {
      await this.Endpoint.triggerSwitchEvent('Single', this.Endpoint.log);
    }
  }

  override async populateInitialState() {
    this.Endpoint.log.info(`PushButton ${this.longname} does not have an initial state to populate.`);
  }
}

export { PushButton };
