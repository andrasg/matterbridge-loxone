import { waterLeakDetector } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { BooleanState } from 'matterbridge/matter/clusters';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { SingleDataPointSensor } from './SingleDataPointSensor.js';

class WaterLeakSensor extends SingleDataPointSensor {
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      WaterLeakSensor.name,
      'water leak sensor',
      structureSection.states.active,
      waterLeakDetector,
      BooleanState.Cluster.id,
      'stateValue'
    );

    let latestValueEvent = this.getLatestValueEvent(structureSection.states.active);
    let initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint.createDefaultBooleanStateClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueUpdateEvent | undefined): boolean {
    return event ? event.value === 1 : false;
  }
}

export { WaterLeakSensor };
