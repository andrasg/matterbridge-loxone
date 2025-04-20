import { bridgedNode, powerSource, waterLeakDetector } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { BooleanState } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';

class WaterLeakSensor extends LoxoneDevice {
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      [waterLeakDetector, bridgedNode, powerSource],
      [structureSection.states.active],
      'contact sensor',
      `${WaterLeakSensor.name}-${structureSection.uuidAction}`,
    );

    let latestValueEvent = this.getLatestInitialValueEvent(structureSection.states.active);
    let initialValue = latestValueEvent ? latestValueEvent.value === 1 : false;

    this.Endpoint.createDefaultBooleanStateClusterServer(initialValue)
        .addRequiredClusterServers()
        .addOptionalClusterServers();
  }

  override async handleLoxoneDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    await this.Endpoint.setAttribute(BooleanState.Cluster.id, 'stateValue', event.value === 1, this.Endpoint.log);
  }
  override async setState() {
    let latestValueEvent = this.getLatestInitialValueEvent(this.structureSection.states.active);
    if (!latestValueEvent) {
      this.Endpoint.log.warn(`No initial value event found for ${this.longname}`);
      return;
    }
    let currentState = latestValueEvent.value === 1;

    if (await this.Endpoint.getAttribute(BooleanState.Cluster.id, 'stateValue', this.Endpoint.log) !== currentState) {
      await this.Endpoint.setAttribute(BooleanState.Cluster.id, 'stateValue', currentState, this.Endpoint.log);
    }
  }
}

export { WaterLeakSensor };
