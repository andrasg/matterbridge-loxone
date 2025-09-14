import { bridgedNode, powerSource, genericSwitch, MatterbridgeEndpoint } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneDevice } from './LoxoneDevice.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';
import { ActiveOnlyStateNameKeys, ActiveOnlyStateNamesType } from './SingleDataPointSensor.js';

class PushButton extends LoxoneDevice<ActiveOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      [genericSwitch, bridgedNode, powerSource],
      ActiveOnlyStateNameKeys,
      'button',
      `${genericSwitch.name}_${control.structureSection.uuidAction.replace(/-/g, '_')}`,
    );

    this.Endpoint = this.createDefaultEndpoint().createDefaultGroupsClusterServer().createDefaultSwitchClusterServer();
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent) {
    if (!(event instanceof LoxoneValueEvent)) return;

    if (event.value === 1) {
      await this.Endpoint.triggerSwitchEvent('Single', this.Endpoint.log);
    }
  }

  override async populateInitialState() {
    this.Endpoint.log.info(`PushButton ${this.longname} does not have an initial state to populate.`);
  }
}

export { PushButton };
