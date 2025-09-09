import { bridgedNode, powerSource, dimmableLight } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { OnOff, LevelControl } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneLevelInfo } from '../data/LoxoneLevelInfo.js';
import { MatterLevelInfo } from '../data/MatterLevelInfo.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

class DimmerLight extends LoxoneDevice {
  override states: Record<'position', string>;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      [dimmableLight, bridgedNode, powerSource],
      [control.structureSection.states.position],
      'dimmable light',
      `${DimmerLight.name}_${control.structureSection.uuidAction.replace(/-/g, '_')}`,
    );
    this.states = control.structureSection.states;

    const latestValueEvent = this.getLatestValueEvent(this.states.position);
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

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent) {
    if (!(event instanceof LoxoneValueEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState() {
    const latestValueEvent = this.getLatestValueEvent(this.states.position);
    if (!latestValueEvent) {
      this.Endpoint.log.warn(`No initial value event found for ${this.longname}`);
      return;
    }

    await this.updateAttributesFromLoxoneEvent(latestValueEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent) {
    const targetLevel = LoxoneLevelInfo.fromLoxoneEvent(event);
    await this.Endpoint.updateAttribute(OnOff.Cluster.id, 'onOff', targetLevel.onOff, this.Endpoint.log);

    if (event.value === 1) {
      await this.Endpoint.updateAttribute(LevelControl.Cluster.id, 'currentLevel', targetLevel.matterLevel, this.Endpoint.log);
    }
  }
}

export { DimmerLight };
