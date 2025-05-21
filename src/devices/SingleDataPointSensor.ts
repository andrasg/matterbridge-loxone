import { bridgedNode, DeviceTypeDefinition, powerSource } from 'matterbridge';
import { ClusterId } from 'matterbridge/matter';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { LoxonePlatform } from '../platform.js';
import { LoxoneDevice } from './LoxoneDevice.js';

abstract class SingleDataPointSensor extends LoxoneDevice {
  clusterId: ClusterId;
  attributeName: string;
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    structureSection: any,
    platform: LoxonePlatform,
    className: string,
    shortTypeName: string,
    statusUUID: string,
    sensorDeviceType: DeviceTypeDefinition,
    clusterId: ClusterId,
    attributeName: string,
  ) {
    super(structureSection, platform, [sensorDeviceType, bridgedNode, powerSource], [statusUUID], shortTypeName, `${className}_${structureSection.uuidAction.replace(/-/g, '_')}`);

    this.clusterId = clusterId;
    this.attributeName = attributeName;

    // at least one status UUID is required
    if (!statusUUID) {
      throw new Error(`No status UUID provided for ${this.longname}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract valueConverter(event: LoxoneValueUpdateEvent | undefined): any;

  override async handleLoxoneDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async setState() {
    const latestValueEvent = this.getLatestValueEvent(this.structureSection.states.active);
    if (!latestValueEvent) {
      this.Endpoint.log.warn(`No initial value event found for ${this.longname}`);
      return;
    }

    await this.updateAttributesFromLoxoneEvent(latestValueEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueUpdateEvent) {
    const value = this.valueConverter(event);
    await this.Endpoint.setAttribute(this.clusterId, this.attributeName, value, this.Endpoint.log);
  }
}

export { SingleDataPointSensor };
