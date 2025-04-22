import { bridgedNode, powerSource, DeviceTypeDefinition } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { OnOff } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';

abstract class OnOffDevice extends LoxoneDevice {
  constructor(
    structureSection: any, 
    platform: LoxonePlatform, 
    className: string, 
    shortTypeName: string, 
    statusUUID: string, 
    onOffDeviceType: DeviceTypeDefinition
  ) {
    super(
      structureSection, 
      platform, 
      [onOffDeviceType, bridgedNode, powerSource], 
      [statusUUID], 
      shortTypeName,
      `${className}_${structureSection.uuidAction.replace(/-/g, '_')}`
    );

    // at least one status UUID is required
    if (!statusUUID) {
      throw new Error(`No status UUID provided for ${this.longname}`);
    }

    let latestValueEvent = this.getLatestValueEvent(statusUUID);
    let initialValue = latestValueEvent ? latestValueEvent.value === 1 : false;

    this.Endpoint
      .createDefaultGroupsClusterServer()
      .createDefaultOnOffClusterServer(initialValue);

    this.addLoxoneCommandHandler('on');
    this.addLoxoneCommandHandler('off');
  }

  override async handleLoxoneDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async setState() {
    let latestValueEvent = this.getLatestValueEvent(this.StatusUUIDs[0]);
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

export { OnOffDevice };
