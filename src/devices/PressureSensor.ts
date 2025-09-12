import { pressureSensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { PressureMeasurement } from 'matterbridge/matter/clusters';
import { ActiveOnlyStateNameKeys, ActiveOnlyStateNames, ActiveOnlyStateNamesType, SingleDataPointSensor } from './SingleDataPointSensor.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

class PressureSensor extends SingleDataPointSensor<ActiveOnlyStateNamesType> {
  constructor(control: Control, platform: LoxonePlatform) {
    super(control, platform, PressureSensor.name, 'pressure sensor', ActiveOnlyStateNameKeys[0], pressureSensor, PressureMeasurement.Cluster.id, 'measuredValue');

    const latestValueEvent = this.getLatestValueEvent(ActiveOnlyStateNames.active);
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint.createDefaultPressureMeasurementClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueEvent | undefined): number {
    return event ? event.value : 0;
  }
}

export { PressureSensor };
