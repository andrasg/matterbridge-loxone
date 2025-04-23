import { lightSensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { IlluminanceMeasurement } from 'matterbridge/matter/clusters';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { SingleDataPointSensor } from './SingleDataPointSensor.js';

class LightSensor extends SingleDataPointSensor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(structureSection, platform, LightSensor.name, 'light sensor', structureSection.states.value, lightSensor, IlluminanceMeasurement.Cluster.id, 'measuredValue');

    const latestValueEvent = this.getLatestValueEvent(structureSection.states.value);
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint.createDefaultIlluminanceMeasurementClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueUpdateEvent | undefined): number {
    return event ? this.luxToMatter(event.value) : 0;
  }

  private luxToMatter(lux: number): number {
    return Math.round(Math.max(Math.min(10000 * Math.log10(lux), 0xfffe), 0));
  }
}

export { LightSensor };
