import { bridgedNode, powerSource, DeviceTypeDefinition, ClusterId } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';

abstract class SingleDataPointSensor extends LoxoneDevice {
  clusterId: ClusterId;
  attributeName: string;
  
  constructor(
    structureSection: any, 
    platform: LoxonePlatform,
    className: string, 
    shortTypeName: string, 
    statusUUID: string, 
    sensorDeviceType: DeviceTypeDefinition,
    clusterId: ClusterId,
    attributeName: string
  ) {
    super(
      structureSection,
      platform,
      [ sensorDeviceType, bridgedNode, powerSource],
      [ statusUUID ],
      shortTypeName,
      `${className}_${structureSection.uuidAction.replace(/-/g, '_')}`
    );

    this.clusterId = clusterId;
    this.attributeName = attributeName;

    // at least one status UUID is required
    if (!statusUUID) {
      throw new Error(`No status UUID provided for ${this.longname}`);
    }    
  }

  abstract valueConverter(event: LoxoneValueUpdateEvent | undefined): any

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
    let value = this.valueConverter(event);
    await this.Endpoint.setAttribute(this.clusterId, this.attributeName, value, this.Endpoint.log);
  }
}

export { SingleDataPointSensor };
