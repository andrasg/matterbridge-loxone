import { temperatureSensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { TemperatureMeasurement } from 'matterbridge/matter/clusters';
import { SingleDataPointSensor } from './SingleDataPointSensor.js';

class TemperatureSensor extends SingleDataPointSensor {
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      TemperatureSensor.name,
      'temperature sensor',
      structureSection.states.value,
      temperatureSensor,
      TemperatureMeasurement.Cluster.id,
      'measuredValue'
    );

    let latestValueEvent = this.getLatestValueEvent(structureSection.states.value);
    let initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint.createDefaultTemperatureMeasurementClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueUpdateEvent | undefined): number {
    return event ? Math.round(event.value * 100) : 0;
  }
}

export { TemperatureSensor };
