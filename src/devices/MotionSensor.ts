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

    let latestValueEvent = this.getLatestInitialValueEvent(structureSection.states.active);
    let initialValue = latestValueEvent ? latestValueEvent.value === 1 : false;

    this.Endpoint.createDefaultOccupancySensingClusterServer(initialValue);
  }

  override async handleLoxoneDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    await this.Endpoint.setAttribute(OccupancySensing.Cluster.id, 'occupancy', { occupied: event.value === 1 }, this.Endpoint.log);
  }

  override async setState() {
    let latestValueEvent = this.getLatestInitialValueEvent(this.structureSection.states.active);
    if (!latestValueEvent) {
      this.Endpoint.log.warn(`No initial value event found for ${this.longname}`);
      return;
    }
    let currentState = latestValueEvent.value === 1;

    if (await this.Endpoint.getAttribute(OccupancySensing.Cluster.id, 'occupancy', this.Endpoint.log) !== currentState) {
      await this.Endpoint.setAttribute(OccupancySensing.Cluster.id, 'occupancy', currentState, this.Endpoint.log);
    }
  }
}

export { MotionSensor };
