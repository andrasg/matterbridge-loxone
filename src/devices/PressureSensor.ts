import { pressureSensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { PressureMeasurement } from 'matterbridge/matter/clusters';
import { SingleDataPointSensor } from './SingleDataPointSensor.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

class PressureSensor extends SingleDataPointSensor {
  override states: Record<'active', string>;

  constructor(control: Control, platform: LoxonePlatform) {
    super(control, platform, PressureSensor.name, 'pressure sensor', control.structureSection.states.active, pressureSensor, PressureMeasurement.Cluster.id, 'measuredValue');
    this.states = control.structureSection.states;

    const latestValueEvent = this.getLatestValueEvent(this.states.active);
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint.createDefaultPressureMeasurementClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueEvent | undefined): number {
    return event ? event.value : 0;
  }
}

export { PressureSensor };
