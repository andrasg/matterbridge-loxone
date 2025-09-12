import { waterLeakDetector } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { BooleanState } from 'matterbridge/matter/clusters';
import { ActiveOnlyStateNameKeys, ActiveOnlyStateNames, ActiveOnlyStateNamesType, SingleDataPointSensor } from './SingleDataPointSensor.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

class WaterLeakSensor extends SingleDataPointSensor<ActiveOnlyStateNamesType> {
  constructor(control: Control, platform: LoxonePlatform) {
    super(control, platform, WaterLeakSensor.name, 'water leak sensor', ActiveOnlyStateNameKeys[0], waterLeakDetector, BooleanState.Cluster.id, 'stateValue');

    const latestValueEvent = this.getLatestValueEvent(ActiveOnlyStateNames.active);
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint.createDefaultBooleanStateClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueEvent | undefined): boolean {
    return event ? event.value === 1 : false;
  }
}

export { WaterLeakSensor };
