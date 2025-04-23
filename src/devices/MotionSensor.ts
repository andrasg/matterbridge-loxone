import { occupancySensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { OccupancySensing } from 'matterbridge/matter/clusters';
import { SingleDataPointSensor } from './SingleDataPointSensor.js';

class MotionSensor extends SingleDataPointSensor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(structureSection, platform, MotionSensor.name, 'motion sensor', structureSection.states.active, occupancySensor, OccupancySensing.Cluster.id, 'occupancy');

    const latestValueEvent = this.getLatestValueEvent(structureSection.states.active);
    const initialValue = this.valueConverter(latestValueEvent).occupied;

    this.Endpoint.createDefaultOccupancySensingClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueUpdateEvent | undefined): { occupied: boolean } {
    return event ? { occupied: event.value === 1 } : { occupied: false };
  }
}

export { MotionSensor };
