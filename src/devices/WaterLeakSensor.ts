import { MatterbridgeEndpoint, waterLeakDetector } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { BooleanState } from 'matterbridge/matter/clusters';
import { ActiveOnlyStateNameKeys, ActiveOnlyStateNames, ActiveOnlyStateNamesType, SingleDataPointSensor } from './SingleDataPointSensor.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';
import { RegisterLoxoneDevice } from './LoxoneDevice.js';
import * as Converters from '../utils/Converters.js';

class WaterLeakSensor extends SingleDataPointSensor<ActiveOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, platform: LoxonePlatform) {
    super(control, platform, WaterLeakSensor.name, 'water leak sensor', ActiveOnlyStateNameKeys[0], waterLeakDetector, BooleanState.Cluster.id, 'stateValue');

    const latestValueEvent = this.getLatestValueEvent(ActiveOnlyStateNames.active);
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint = this.createDefaultEndpoint().createDefaultBooleanStateClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueEvent | undefined): boolean {
    return Converters.booleanValueConverter(event);
  }

  static override typeNames(): string[] {
    return ['leak', 'waterleak'];
  }
}

RegisterLoxoneDevice(WaterLeakSensor);

export { WaterLeakSensor };
