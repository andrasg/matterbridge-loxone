import { humiditySensor, MatterbridgeEndpoint } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { RelativeHumidityMeasurement } from 'matterbridge/matter/clusters';
import { SingleDataPointSensor, ValueOnlyStateNamesType, ValueOnlyStateNameKeys } from './SingleDataPointSensor.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

class HumiditySensor extends SingleDataPointSensor<ValueOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, platform: LoxonePlatform) {
    super(control, platform, HumiditySensor.name, 'humidity sensor', ValueOnlyStateNameKeys[0], humiditySensor, RelativeHumidityMeasurement.Cluster.id, 'measuredValue');

    const latestValueEvent = this.getLatestValueEvent(this.singleStateName);
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint = this.createDefaultEndpoint().createDefaultRelativeHumidityMeasurementClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueEvent | undefined): number {
    return event ? Math.round(event.value * 100) : 0;
  }
}

export { HumiditySensor };
