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

    let initialValue = this.latestInitialValueEvent ? this.latestInitialValueEvent.value : 0;

    this.Endpoint.createDefaultTemperatureMeasurementClusterServer(initialValue * 100);
  }

  override async handleDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    await this.Endpoint.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', event.value * 100, this.Endpoint.log);
  }
}

export { TemperatureSensor };
