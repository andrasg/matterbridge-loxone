import { bridgedNode, powerSource, onOffSwitch } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { OnOff } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

const StateNames = {
  activeOutput: 'activeOutput',
} as const;
type StateNameType = (typeof StateNames)[keyof typeof StateNames];
const StateNameKeys = Object.values(StateNames) as StateNameType[];

class RadioButton extends LoxoneDevice<StateNameType> {
  outputId: number;

  constructor(control: Control, platform: LoxonePlatform, outputId: number, outputName: string) {
    super(
      control,
      platform,
      [onOffSwitch, bridgedNode, powerSource],
      StateNameKeys,
      'radio button',
      `${RadioButton.name}_${control.structureSection.uuidAction.replace(/-/g, '_')}_${outputId}`,
      outputName,
    );

    this.outputId = outputId;
    const latestActiveOutputEvent = this.getLatestValueEvent(StateNames.activeOutput);
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
    const latestActiveOutputEvent = this.getLatestValueEvent(StateNames.activeOutput);
    await this.updateAttributesFromLoxoneEvent(latestActiveOutputEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent) {
    await this.Endpoint.updateAttribute(OnOff.Cluster.id, 'onOff', event.value === this.outputId, this.Endpoint.log);
  }
}

export { RadioButton };
