import { humiditySensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { RelativeHumidityMeasurement } from 'matterbridge/matter/clusters';
import { SingleDataPointSensor } from './SingleDataPointSensor.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

class HumiditySensor extends SingleDataPointSensor {
  override states: Record<'value', string>;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      HumiditySensor.name,
      'humidity sensor',
      control.structureSection.states.value,
      humiditySensor,
      RelativeHumidityMeasurement.Cluster.id,
      'measuredValue',
    );
    this.states = control.structureSection.states;

    const latestValueEvent = this.getLatestValueEvent(this.states.value);
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint.createDefaultRelativeHumidityMeasurementClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueEvent | undefined): number {
    return event ? Math.round(event.value * 100) : 0;
  }
}

export { HumiditySensor };
