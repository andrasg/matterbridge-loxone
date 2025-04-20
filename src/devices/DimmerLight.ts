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

    let initialValue = this.latestInitialValueEvent ? Math.round(this.latestInitialValueEvent.value * 2.54) : 0;

    this.Endpoint.createDefaultOnOffClusterServer(initialValue !== 0).createDefaultLevelControlClusterServer(initialValue);

    this.addLoxoneCommandHandler('on');
    this.addLoxoneCommandHandler('off');
    this.addLoxoneCommandHandler('moveToLevel', ({ request: { level } }) => Math.round(level / 2.54).toString());
    this.addLoxoneCommandHandler('moveToLevelWithOnOff', ({ request: { level } }) => Math.round(level / 2.54).toString());
  }

  override async handleDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    if (event.value === 0) {
      await this.Endpoint.setAttribute(OnOff.Cluster.id, 'onOff', false, this.Endpoint.log);
    } else {
      let targetLevel = Math.round(event.value * 2.54);
      await this.Endpoint.setAttribute(OnOff.Cluster.id, 'onOff', true, this.Endpoint.log);
      await this.Endpoint.setAttribute(LevelControl.Cluster.id, 'currentLevel', targetLevel, this.Endpoint.log);
    }
  }
}

export { DimmerLight };
