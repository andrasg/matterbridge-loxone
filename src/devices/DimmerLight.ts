import type LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import type Control from 'loxone-ts-api/dist/Structure/Control.js';
import { bridgedNode, powerSource, dimmableLight, type MatterbridgeEndpoint } from 'matterbridge';
import { OnOff, LevelControl } from 'matterbridge/matter/clusters';

import { LoxoneLevelInfo } from '../data/LoxoneLevelInfo.js';
import { MatterLevelInfo } from '../data/MatterLevelInfo.js';
import type { DeviceHost } from './DeviceHost.js';
import { LightCommandBridge } from './LightCommandBridge.js';
import { LoxoneDevice } from './LoxoneDevice.js';

const STATE_NAMES = ['position'] as const;
type StateNameType = (typeof STATE_NAMES)[number];

class DimmerLight extends LoxoneDevice<StateNameType> {
  public Endpoint: MatterbridgeEndpoint;
  private readonly lightCommands: LightCommandBridge;
  private shouldRestorePosition = false;

  constructor(control: Control, host: DeviceHost) {
    super(control, host, [dimmableLight, bridgedNode, powerSource], STATE_NAMES, 'dimmable light', `${DimmerLight.name}_${control.structureSection.uuidAction.replace(/-/g, '_')}`);
    const latestValueEvent = this.getLatestValueEvent('position');
    const value = LoxoneLevelInfo.fromLoxoneEvent(latestValueEvent);

    this.Endpoint = this.createDefaultEndpoint()
      .createDefaultGroupsClusterServer()
      .createDefaultOnOffClusterServer(value.onOff)
      .createDefaultLevelControlClusterServer(value.onOff ? value.matterLevel : 254);

    for (const command of ['on', 'toggle', 'onWithTimedOff'] as const) {
      this.Endpoint.subscribeCommand(OnOff, command, () => {
        this.shouldRestorePosition = true;
      });
    }
    for (const command of ['off', 'offWithEffect', 'onWithRecallGlobalScene'] as const) {
      this.Endpoint.subscribeCommand(OnOff, command, () => {
        this.shouldRestorePosition = false;
      });
    }
    for (const command of ['moveToLevel', 'move', 'step', 'stop', 'moveToLevelWithOnOff', 'moveWithOnOff', 'stepWithOnOff', 'stopWithOnOff'] as const) {
      this.Endpoint.subscribeCommand(LevelControl, command, () => {
        this.shouldRestorePosition = false;
      });
    }

    this.lightCommands = new LightCommandBridge(
      this.Endpoint,
      () => {
        if (!this.Endpoint.getAttribute(OnOff, 'onOff')) return 'off';
        if (this.shouldRestorePosition) return 'on';
        const level = this.Endpoint.getAttribute(LevelControl, 'currentLevel');
        return level === null || level === undefined ? 'on' : Math.max(1, MatterLevelInfo.fromMatterNumber(level).loxoneLevel).toString();
      },
      async (command) => await this.host.sendControlCommand(this.control.uuidAction, command),
    );
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void> {
    if (!(event instanceof LoxoneValueEvent)) return;

    await this.lightCommands.updateFromLoxone(async () => await this.updateAttributesFromLoxoneEvent(event));
  }

  override async populateInitialState(): Promise<void> {
    const latestValueEvent = this.getLatestValueEvent('position');
    await this.lightCommands.updateFromLoxone(async () => await this.updateAttributesFromLoxoneEvent(latestValueEvent));
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent): Promise<void> {
    const targetLevel = LoxoneLevelInfo.fromLoxoneEvent(event);
    await this.Endpoint.updateAttribute(OnOff.id, 'onOff', targetLevel.onOff, this.Endpoint.log);

    if (event.value > 0) {
      await this.Endpoint.updateAttribute(LevelControl.id, 'currentLevel', targetLevel.matterLevel, this.Endpoint.log);
    }
  }

  static override typeNames(): string[] {
    return ['dimmer'];
  }
}

export { DimmerLight };
