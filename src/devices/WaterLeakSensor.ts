import { waterLeakDetector } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { BooleanState } from 'matterbridge/matter/clusters';
import { SingleDataPointSensor } from './SingleDataPointSensor.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

class WaterLeakSensor extends SingleDataPointSensor {
  override states: Record<'active', string>;

  constructor(control: Control, platform: LoxonePlatform) {
    super(control, platform, WaterLeakSensor.name, 'water leak sensor', control.structureSection.states.active, waterLeakDetector, BooleanState.Cluster.id, 'stateValue');

    this.states = control.structureSection.states;

    const latestValueEvent = this.getLatestValueEvent(this.states.active);
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint.createDefaultBooleanStateClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueEvent | undefined): boolean {
    return event ? event.value === 1 : false;
  }
}

export { WaterLeakSensor };
