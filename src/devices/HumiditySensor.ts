import { humiditySensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { RelativeHumidityMeasurement } from 'matterbridge/matter/clusters';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { SingleDataPointSensor } from './SingleDataPointSensor.js';

class HumiditySensor extends SingleDataPointSensor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      HumiditySensor.name,
      'humidity sensor',
      structureSection.states.value,
      humiditySensor,
      RelativeHumidityMeasurement.Cluster.id,
      'measuredValue',
    );

    const latestValueEvent = this.getLatestValueEvent(structureSection.states.value);
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint.createDefaultRelativeHumidityMeasurementClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueUpdateEvent | undefined): number {
    return event ? Math.round(event.value * 100) : 0;
  }
}

export { HumiditySensor };
