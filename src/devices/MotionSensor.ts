import { bridgedNode, powerSource, occupancySensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { OccupancySensing } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';

class MotionSensor extends LoxoneDevice {
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      [occupancySensor, bridgedNode, powerSource],
      [structureSection.states.active],
      'motion sensor',
      `${MotionSensor.name}-${structureSection.uuidAction}`,
    );

    let initialValue = this.latestInitialValueEvent ? this.latestInitialValueEvent.value === 1 : false;

    this.Endpoint.createDefaultOccupancySensingClusterServer(initialValue);
  }

  override async handleDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    await this.Endpoint.setAttribute(OccupancySensing.Cluster.id, 'occupancy', { occupied: event.value === 1 }, this.Endpoint.log);
  }
}

export { MotionSensor };
