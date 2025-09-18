import { MatterbridgeEndpoint, temperatureSensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { TemperatureMeasurement } from 'matterbridge/matter/clusters';
import { SingleDataPointSensor, ValueOnlyStateNameKeys, ValueOnlyStateNames, ValueOnlyStateNamesType } from './SingleDataPointSensor.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';
import { RegisterLoxoneDevice } from './LoxoneDevice.js';
import * as Converters from '../utils/Converters.js';

class TemperatureSensor extends SingleDataPointSensor<ValueOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, platform: LoxonePlatform) {
    super(control, platform, TemperatureSensor.name, 'temperature sensor', ValueOnlyStateNameKeys[0], temperatureSensor, TemperatureMeasurement.Cluster.id, 'measuredValue');
    const latestValueEvent = this.getLatestValueEvent(ValueOnlyStateNames.value);
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint = this.createDefaultEndpoint().createDefaultTemperatureMeasurementClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueEvent | undefined): number {
    return Converters.numberValueConverter(event);
  }

  static override typeNames(): string[] {
    return ['temperature'];
  }
}

RegisterLoxoneDevice(TemperatureSensor);

export { TemperatureSensor };
