import { bridgedNode, powerSource, onOffSwitch } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { OnOff } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

class RadioButton extends LoxoneDevice {
  outputId: number;
  override states: Record<'activeOutput', string>;

  constructor(control: Control, platform: LoxonePlatform, outputId: number, outputName: string) {
    super(
      control,
      platform,
      [onOffSwitch, bridgedNode, powerSource],
      [control.structureSection.states.activeOutput],
      'radio button',
      `${RadioButton.name}_${control.structureSection.uuidAction.replace(/-/g, '_')}_${outputId}`,
      outputName,
    );
    this.states = control.structureSection.states;

    this.outputId = outputId;
    const latestActiveOutputEvent = this.getLatestValueEvent(this.states.activeOutput);
    const initialValue = latestActiveOutputEvent ? latestActiveOutputEvent.value === this.outputId : false;

    this.Endpoint.createDefaultGroupsClusterServer().createDefaultOnOffClusterServer(initialValue);

    this.addLoxoneCommandHandler('on', () => {
      return `${this.outputId}`;
    });
    this.addLoxoneCommandHandler('off', () => {
      return `reset`;
    });
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent) {
    if (!(event instanceof LoxoneValueEvent)) return;

    this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState() {
    const latestActiveOutputEvent = this.getLatestValueEvent(this.states.activeOutput);

    if (!latestActiveOutputEvent) {
      this.Endpoint.log.warn(`No initial text event found for ${this.longname}`);
      return;
    }

    await this.updateAttributesFromLoxoneEvent(latestActiveOutputEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent) {
    await this.Endpoint.updateAttribute(OnOff.Cluster.id, 'onOff', event.value === this.outputId, this.Endpoint.log);
  }
}

export { RadioButton };
