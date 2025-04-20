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
      `${LightSensor.name}-${structureSection.uuidAction}`,
    );

    let latestValueEvent = this.getLatestInitialValueEvent(structureSection.states.value);
    let initialValue = latestValueEvent ? latestValueEvent.value : 0;

    this.Endpoint.createDefaultIlluminanceMeasurementClusterServer(this.luxToMatter(initialValue));
  }

  override async handleLoxoneDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    await this.Endpoint.setAttribute(IlluminanceMeasurement.Cluster.id, 'measuredValue', this.luxToMatter(event.value), this.Endpoint.log);
  }

  private luxToMatter(lux: number): number {
    return Math.round(Math.max(Math.min(10000 * Math.log10(lux), 0xfffe), 0));
  }

  private matterToLux(value: number): number {
    return Math.round(Math.max(Math.pow(10, value / 10000), 0));
  }

  override async setState() {
    let latestValueEvent = this.getLatestInitialValueEvent(this.structureSection.states.value);
    if (!latestValueEvent) {
      this.Endpoint.log.warn(`No initial value event found for ${this.longname}`);
      return;
    }
    let currentValue = this.luxToMatter(latestValueEvent.value);

    if (await this.Endpoint.getAttribute(IlluminanceMeasurement.Cluster.id, 'measuredValue', this.Endpoint.log) !== currentValue) {
      await this.Endpoint.setAttribute(IlluminanceMeasurement.Cluster.id, 'measuredValue', currentValue, this.Endpoint.log);
    }
  }

}

export { LightSensor };
