import { bridgedNode, DeviceTypeDefinition, powerSource } from 'matterbridge';
import { ClusterId } from 'matterbridge/matter';
import { LoxonePlatform } from '../platform.js';
import { LoxoneDevice } from './LoxoneDevice.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

abstract class SingleDataPointSensor extends LoxoneDevice {
  abstract override states: Record<string, string>;
  clusterId: ClusterId;
  attributeName: string;
  constructor(
    control: Control,
    platform: LoxonePlatform,
    className: string,
    shortTypeName: string,
    statusUUID: string,
    sensorDeviceType: DeviceTypeDefinition,
    clusterId: ClusterId,
    attributeName: string,
  ) {
    super(control, platform, [sensorDeviceType, bridgedNode, powerSource], [statusUUID], shortTypeName, `${className}_${control.structureSection.uuidAction.replace(/-/g, '_')}`);

    this.clusterId = clusterId;
    this.attributeName = attributeName;

    // at least one status UUID is required
    if (!statusUUID) {
      throw new Error(`No status UUID provided for ${this.longname}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract valueConverter(event: LoxoneValueEvent | undefined): any;

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent) {
    if (!(event instanceof LoxoneValueEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState() {
    const latestValueEvent = this.getLatestValueEvent(this.control.structureSection.states.active);
    if (!latestValueEvent) {
      this.Endpoint.log.warn(`No initial value event found for ${this.longname}`);
      return;
    }

    await this.updateAttributesFromLoxoneEvent(latestValueEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent) {
    const value = this.valueConverter(event);
    await this.Endpoint.updateAttribute(this.clusterId, this.attributeName, value, this.Endpoint.log);
  }
}

export { SingleDataPointSensor };
