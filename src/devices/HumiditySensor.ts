import { bridgedNode, powerSource, humiditySensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { RelativeHumidityMeasurement } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';

class HumiditySensor extends LoxoneDevice {
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      [humiditySensor, bridgedNode, powerSource],
      [structureSection.states.value],
      'humidity sensor',
      `${HumiditySensor.name}-${structureSection.uuidAction}`,
    );

    let latestValueEvent = this.getLatestInitialValueEvent(structureSection.states.value);
    let initialValue = latestValueEvent ? latestValueEvent.value : 0;

    this.Endpoint.createDefaultRelativeHumidityMeasurementClusterServer(Math.round(initialValue * 100));
  }

  override async handleDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    await this.Endpoint.setAttribute(RelativeHumidityMeasurement.Cluster.id, 'measuredValue', Math.round(event.value * 100), this.Endpoint.log);
  }
}

export { HumiditySensor };
