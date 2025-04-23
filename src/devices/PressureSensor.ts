import { pressureSensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { PressureMeasurement } from 'matterbridge/matter/clusters';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { SingleDataPointSensor } from './SingleDataPointSensor.js';

class PressureSensor extends SingleDataPointSensor {
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      PressureSensor.name,
      'pressure sensor',
      structureSection.states.active,
      pressureSensor,
      PressureMeasurement.Cluster.id,
      'measuredValue',
    );

    let latestValueEvent = this.getLatestValueEvent(structureSection.states.active);
    let initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint.createDefaultPressureMeasurementClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueUpdateEvent | undefined): number {
    return event ? event.value : 0;
  }
}

export { PressureSensor };
