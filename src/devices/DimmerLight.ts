import { bridgedNode, powerSource, dimmableLight } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { OnOff, LevelControl } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';

class DimmerLight extends LoxoneDevice {
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      [dimmableLight, bridgedNode, powerSource],
      [structureSection.states.position],
      'dimmable light',
      `${DimmerLight.name}-${structureSection.uuidAction}`,
    );

    let latestValueEvent = this.getLatestInitialValueEvent(structureSection.states.position);
    let initialValue = latestValueEvent ? this.convertLoxoneValueToMatter(latestValueEvent.value) : 1;

    this.Endpoint.createDefaultOnOffClusterServer(initialValue !== 0).createDefaultLevelControlClusterServer(initialValue);

    this.addLoxoneCommandHandler('on');
    this.addLoxoneCommandHandler('off');
    this.addLoxoneCommandHandler('moveToLevel', ({ request: { level } }) => this.convertMatterToLoxone(level).toString());
    this.addLoxoneCommandHandler('moveToLevelWithOnOff', ({ request: { level } }) => this.convertMatterToLoxone(level).toString());
  }

  override async handleLoxoneDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    if (event.value === 0) {
      await this.Endpoint.setAttribute(OnOff.Cluster.id, 'onOff', false, this.Endpoint.log);
    } else {
      let targetLevel = this.convertLoxoneValueToMatter(event.value);
      await this.Endpoint.setAttribute(OnOff.Cluster.id, 'onOff', true, this.Endpoint.log);
      await this.Endpoint.setAttribute(LevelControl.Cluster.id, 'currentLevel', targetLevel, this.Endpoint.log);
    }
  }

  convertLoxoneValueToMatter(value: number | undefined): number {
    if (value === undefined) return 1;
    let scaledValue = Math.round(value * 2.54);
    return Math.min(Math.max(scaledValue, 1), 254);
  }

  convertMatterToLoxone(value: number | undefined): number {
    if (value === undefined) return 0;
    let scaledValue = Math.round(value / 2.54);
    return Math.min(Math.max(scaledValue, 0), 100);
  }

  override async setState() {
    let latestValueEvent = this.getLatestInitialValueEvent(this.structureSection.states.position);
    if (!latestValueEvent) {
      this.Endpoint.log.warn(`No initial value event found for ${this.longname}`);
      return;
    }
    let currentValue = latestValueEvent.value;

    if (currentValue === 0) {
      await this.Endpoint.setAttribute(OnOff.Cluster.id, 'onOff', false, this.Endpoint.log);
    } else {
      let targetLevel = this.convertLoxoneValueToMatter(currentValue);
      await this.Endpoint.setAttribute(OnOff.Cluster.id, 'onOff', true, this.Endpoint.log);
      await this.Endpoint.setAttribute(LevelControl.Cluster.id, 'currentLevel', targetLevel, this.Endpoint.log);
    }
  }

}

export { DimmerLight };
