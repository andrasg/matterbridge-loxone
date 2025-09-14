import { MatterbridgeEndpoint, occupancySensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { OccupancySensing } from 'matterbridge/matter/clusters';
import { ActiveOnlyStateNameKeys, ActiveOnlyStateNames, ActiveOnlyStateNamesType, SingleDataPointSensor } from './SingleDataPointSensor.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

class MotionSensor extends SingleDataPointSensor<ActiveOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, platform: LoxonePlatform) {
    super(control, platform, MotionSensor.name, 'motion sensor', ActiveOnlyStateNameKeys[0], occupancySensor, OccupancySensing.Cluster.id, 'occupancy');

    const latestValueEvent = this.getLatestValueEvent(ActiveOnlyStateNames.active);
    const initialValue = this.valueConverter(latestValueEvent).occupied;

    this.Endpoint = this.createDefaultEndpoint().createDefaultOccupancySensingClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueEvent | undefined): { occupied: boolean } {
    return event ? { occupied: event.value === 1 } : { occupied: false };
  }
}

export { MotionSensor };
