import { lightSensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { IlluminanceMeasurement } from 'matterbridge/matter/clusters';
import { SingleDataPointSensor, ValueOnlyStateNameKeys, ValueOnlyStateNames, ValueOnlyStateNamesType } from './SingleDataPointSensor.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

class LightSensor extends SingleDataPointSensor<ValueOnlyStateNamesType> {
  constructor(control: Control, platform: LoxonePlatform) {
    super(control, platform, LightSensor.name, 'light sensor', ValueOnlyStateNameKeys[0], lightSensor, IlluminanceMeasurement.Cluster.id, 'measuredValue');

    const latestValueEvent = this.getLatestValueEvent(ValueOnlyStateNames.value);
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint.createDefaultIlluminanceMeasurementClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueEvent | undefined): number {
    if (!event) return 0;

    return Math.round(Math.max(Math.min(10000 * Math.log10(event.value), 0xfffe), 0));
  }
}

export { LightSensor };
