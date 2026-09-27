import type LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import type Control from 'loxone-ts-api/dist/Structure/Control.js';
import { bridgedNode, powerSource, type DeviceTypeDefinition, type MatterbridgeEndpoint } from 'matterbridge';
import { OnOff } from 'matterbridge/matter/clusters';

import type { DeviceHost } from './DeviceHost.js';
import { LightCommandBridge } from './LightCommandBridge.js';
import { LoxoneDevice } from './LoxoneDevice.js';
import { ACTIVE_ONLY_STATE_NAMES, type ActiveOnlyStateNamesType } from './SingleDataPointSensor.js';

abstract class OnOffDevice extends LoxoneDevice<ActiveOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;
  private readonly lightCommands: LightCommandBridge | undefined;

  constructor(control: Control, host: DeviceHost, className: string, shortTypeName: string, onOffDeviceType: DeviceTypeDefinition, forwardLightState = false) {
    super(
      control,
      host,
      [onOffDeviceType, bridgedNode, powerSource],
      ACTIVE_ONLY_STATE_NAMES,
      shortTypeName,
      `${className}_${control.structureSection.uuidAction.replace(/-/g, '_')}`,
    );

    const latestValueEvent = this.getLatestValueEvent('active');
    const initialValue = latestValueEvent ? latestValueEvent.value === 1 : false;

    this.Endpoint = this.createDefaultEndpoint().createDefaultGroupsClusterServer().createDefaultOnOffClusterServer(initialValue);

    if (forwardLightState) {
      this.lightCommands = new LightCommandBridge(
        this.Endpoint,
        () => (this.Endpoint.getAttribute(OnOff, 'onOff') ? 'on' : 'off'),
        async (command) => await this.host.sendControlCommand(this.control.uuidAction, command),
      );
    } else {
      this.addLoxoneCommandHandler('on');
      this.addLoxoneCommandHandler('off');
    }
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void> {
    if (!(event instanceof LoxoneValueEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState(): Promise<void> {
    const latestValueEvent = this.getLatestValueEvent('active');
    await this.updateAttributesFromLoxoneEvent(latestValueEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent): Promise<void> {
    const update = async (): Promise<void> => {
      await this.Endpoint.updateAttribute(OnOff.id, 'onOff', event.value === 1, this.Endpoint.log);
    };
    if (this.lightCommands) {
      await this.lightCommands.updateFromLoxone(update);
    } else {
      await update();
    }
  }
}

export { OnOffDevice };
