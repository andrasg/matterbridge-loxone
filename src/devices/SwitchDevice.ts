import { bridgedNode, powerSource, onOffSwitch } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { OnOff } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';

class SwitchDevice extends LoxoneDevice {
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection, 
      platform, 
      [onOffSwitch, bridgedNode, powerSource], 
      [structureSection.states.active], 
      'switch', 
      `${SwitchDevice.name}-${structureSection.uuidAction}`
    );

    let latestValueEvent = this.getLatestValueEvent(structureSection.states.active);
    let initialValue = latestValueEvent ? latestValueEvent.value === 1 : false;

    this.Endpoint.createDefaultOnOffClusterServer(initialValue);

    this.addLoxoneCommandHandler('on');
    this.addLoxoneCommandHandler('off');
  }

  override async handleLoxoneDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async setState() {
    let latestValueEvent = this.getLatestValueEvent(this.structureSection.states.active);
    if (!latestValueEvent) {
      this.Endpoint.log.warn(`No initial value event found for ${this.longname}`);
      return;
    }

    await this.updateAttributesFromLoxoneEvent(latestValueEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueUpdateEvent) {
    await this.Endpoint.setAttribute(OnOff.Cluster.id, 'onOff', event.value === 1, this.Endpoint.log);
  }
}

export { SwitchDevice };
