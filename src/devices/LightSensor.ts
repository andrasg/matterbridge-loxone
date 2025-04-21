import { bridgedNode, powerSource, lightSensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { IlluminanceMeasurement } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';

class LightSensor extends LoxoneDevice {
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      [lightSensor, bridgedNode, powerSource],
      [structureSection.states.value],
      'light sensor',
      `${LightSensor.name}_${structureSection.uuidAction.replace(/-/g, '_')}`,
    );

    let latestValueEvent = this.getLatestValueEvent(structureSection.states.value);
    let initialValue = latestValueEvent ? latestValueEvent.value : 0;

    this.Endpoint.createDefaultIlluminanceMeasurementClusterServer(this.luxToMatter(initialValue));
  }

  override async handleLoxoneDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  private luxToMatter(lux: number): number {
    return Math.round(Math.max(Math.min(10000 * Math.log10(lux), 0xfffe), 0));
  }

  private matterToLux(value: number): number {
    return Math.round(Math.max(Math.pow(10, value / 10000), 0));
  }

  override async setState() {
    let latestValueEvent = this.getLatestValueEvent(this.structureSection.states.value);
    if (!latestValueEvent) {
      this.Endpoint.log.warn(`No initial value event found for ${this.longname}`);
      return;
    }

    await this.updateAttributesFromLoxoneEvent(latestValueEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueUpdateEvent) {
    let currentValue = this.luxToMatter(event.value);
    await this.Endpoint.setAttribute(IlluminanceMeasurement.Cluster.id, 'measuredValue', currentValue, this.Endpoint.log);
  }
}

export { LightSensor };
