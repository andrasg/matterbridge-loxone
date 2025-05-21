import { bridgedNode, powerSource, dimmableLight } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { OnOff, LevelControl } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { LoxoneLevelInfo } from '../data/LoxoneLevelInfo.js';
import { MatterLevelInfo } from '../data/MatterLevelInfo.js';

class DimmerLight extends LoxoneDevice {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      [dimmableLight, bridgedNode, powerSource],
      [structureSection.states.position],
      'dimmable light',
      `${DimmerLight.name}_${structureSection.uuidAction.replace(/-/g, '_')}`,
    );

    const latestValueEvent = this.getLatestValueEvent(structureSection.states.position);
    const value = LoxoneLevelInfo.fromLoxoneEvent(latestValueEvent);

    this.Endpoint.createDefaultGroupsClusterServer().createDefaultOnOffClusterServer(value.onOff).createDefaultLevelControlClusterServer(value.matterLevel);

    this.addLoxoneCommandHandler('on');
    this.addLoxoneCommandHandler('off');
    this.addLoxoneCommandHandler('moveToLevel', ({ request: { level } }) => {
      const value = MatterLevelInfo.fromMatterNumber(level);
      return value.loxoneLevel.toString();
    });
    this.addLoxoneCommandHandler('moveToLevelWithOnOff', ({ request: { level } }) => {
      const value = MatterLevelInfo.fromMatterNumber(level);
      return value.loxoneLevel.toString();
    });
  }

  override async handleLoxoneDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState() {
    const latestValueEvent = this.getLatestValueEvent(this.structureSection.states.position);
    if (!latestValueEvent) {
      this.Endpoint.log.warn(`No initial value event found for ${this.longname}`);
      return;
    }

    await this.updateAttributesFromLoxoneEvent(latestValueEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueUpdateEvent) {
    const targetLevel = LoxoneLevelInfo.fromLoxoneEvent(event);
    await this.Endpoint.setAttribute(OnOff.Cluster.id, 'onOff', targetLevel.onOff, this.Endpoint.log);

    if (event.value === 1) {
      await this.Endpoint.setAttribute(LevelControl.Cluster.id, 'currentLevel', targetLevel.matterLevel, this.Endpoint.log);
    }
  }
}

export { DimmerLight };
