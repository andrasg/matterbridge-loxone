import { occupancySensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { OccupancySensing } from 'matterbridge/matter/clusters';
import { SingleDataPointSensor } from './SingleDataPointSensor.js';

class MotionSensor extends SingleDataPointSensor {
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      MotionSensor.name,
      'motion sensor',
      structureSection.states.active,
      occupancySensor,
      OccupancySensing.Cluster.id,
      'occupancy',
    );

    let latestValueEvent = this.getLatestValueEvent(structureSection.states.active);
    let initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint.createDefaultOccupancySensingClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueUpdateEvent | undefined): any {
    return event ? { occupied: event.value === 1 } : { occupied: false };
  }
}

export { MotionSensor };
