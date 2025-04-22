import { bridgedNode, powerSource, onOffSwitch } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { OnOff } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';

class RadioButton extends LoxoneDevice {
  outputId: number;

  constructor(structureSection: any, platform: LoxonePlatform, outputId: number, outputName: string) {
    super(
      structureSection,
      platform,
      [onOffSwitch, bridgedNode, powerSource],
      [structureSection.states.activeOutput],
      'radio button',
      `${RadioButton.name}_${structureSection.uuidAction.replace(/-/g, '_')}_${outputId}`,
      outputName
    );

    this.outputId = outputId;
    let latestActiveOutputEvent = this.getLatestValueEvent(structureSection.states.activeOutput);
    let initialValue = latestActiveOutputEvent ? latestActiveOutputEvent.value === this.outputId : false;

    this.Endpoint
      .createDefaultGroupsClusterServer()
      .createDefaultOnOffClusterServer(initialValue);

    this.addLoxoneCommandHandler('on', () => {
      return `${this.outputId}`;
    });
    this.addLoxoneCommandHandler('off', () => {
      return `reset`;
    });
  }

  override async handleLoxoneDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    this.updateAttributesFromLoxoneEvent(event);
  }

  override async setState() {
    let latestActiveOutputEvent = this.getLatestValueEvent(this.structureSection.states.activeOutput);

    if (!latestActiveOutputEvent) {
      this.Endpoint.log.warn(`No initial text event found for ${this.longname}`);
      return;
    }

    await this.updateAttributesFromLoxoneEvent(latestActiveOutputEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueUpdateEvent) {
    await this.Endpoint.setAttribute(OnOff.Cluster.id, 'onOff', event.value === this.outputId, this.Endpoint.log);
  }
}

export { RadioButton };
