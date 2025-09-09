import { bridgedNode, powerSource, onOffSwitch } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { OnOff } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

class OnOffButton extends LoxoneDevice {
  override states: Record<'active', string>;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      [onOffSwitch, bridgedNode, powerSource],
      [control.structureSection.states.active],
      'button',
      `${OnOffButton.name}_${control.structureSection.uuidAction.replace(/-/g, '_')}`,
    );
    this.states = control.structureSection.states;

    const latestValueEvent = this.getLatestValueEvent(this.states.active);
    const initialValue = latestValueEvent ? latestValueEvent.value === 1 : false;

    this.Endpoint.createDefaultGroupsClusterServer().createDefaultOnOffClusterServer(initialValue);

    this.addLoxoneCommandHandler('on', () => {
      setTimeout(() => {
        this.Endpoint.updateAttribute(OnOff.Cluster.id, 'onOff', false, this.Endpoint.log);
      }, 1000);
      return 'pulse';
    });
    this.addLoxoneCommandHandler('off');
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent) {
    if (!(event instanceof LoxoneValueEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState() {
    const latestValueEvent = this.getLatestValueEvent(this.states.active);
    if (!latestValueEvent) {
      this.Endpoint.log.warn(`No initial value event found for ${this.longname}`);
      return;
    }

    await this.updateAttributesFromLoxoneEvent(latestValueEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent) {
    await this.Endpoint.updateAttribute(OnOff.Cluster.id, 'onOff', event.value === 1, this.Endpoint.log);
  }
}

export { OnOffButton };
