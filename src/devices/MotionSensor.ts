import { occupancySensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { OccupancySensing } from 'matterbridge/matter/clusters';
import { SingleDataPointSensor } from './SingleDataPointSensor.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

class MotionSensor extends SingleDataPointSensor {
  override states: Record<'active', string>;

  constructor(control: Control, platform: LoxonePlatform) {
    super(control, platform, MotionSensor.name, 'motion sensor', control.structureSection.states.active, occupancySensor, OccupancySensing.Cluster.id, 'occupancy');

    this.states = control.structureSection.states;

    const latestValueEvent = this.getLatestValueEvent(this.states.active);
    const initialValue = this.valueConverter(latestValueEvent).occupied;

    this.Endpoint.createDefaultOccupancySensingClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueEvent | undefined): { occupied: boolean } {
    return event ? { occupied: event.value === 1 } : { occupied: false };
  }
}

export { MotionSensor };
