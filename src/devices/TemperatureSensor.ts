import { bridgedNode, powerSource, temperatureSensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { TemperatureMeasurement } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';

class TemperatureSensor extends LoxoneDevice {
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      [temperatureSensor, bridgedNode, powerSource],
      [structureSection.states.value],
      'temperature sensor',
      `${TemperatureSensor.name}-${structureSection.uuidAction}`,
    );

    let latestValueEvent = this.getLatestInitialValueEvent(structureSection.states.value);
    let initialValue = latestValueEvent ? latestValueEvent.value : 0;

    this.Endpoint.createDefaultTemperatureMeasurementClusterServer(Math.round(initialValue * 100));
  }

  override async handleLoxoneDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    await this.Endpoint.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', Math.round(event.value * 100), this.Endpoint.log);
  }

  override async setState() {
    let latestValueEvent = this.getLatestInitialValueEvent(this.structureSection.states.value);
    if (!latestValueEvent) {
      this.Endpoint.log.warn(`No initial value event found for ${this.longname}`);
      return;
    }
    let currentValue = latestValueEvent.value;

    if (await this.Endpoint.getAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', this.Endpoint.log) !== currentValue) {
      await this.Endpoint.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', currentValue, this.Endpoint.log);
    }
  }
}

export { TemperatureSensor };
