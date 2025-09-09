import { bridgedNode, powerSource, DeviceTypeDefinition } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { OnOff } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

abstract class OnOffDevice extends LoxoneDevice {
  constructor(control: Control, platform: LoxonePlatform, className: string, shortTypeName: string, statusUUID: string, onOffDeviceType: DeviceTypeDefinition) {
    super(control, platform, [onOffDeviceType, bridgedNode, powerSource], [statusUUID], shortTypeName, `${className}_${control.structureSection.uuidAction.replace(/-/g, '_')}`);

    // at least one status UUID is required
    if (!statusUUID) {
      throw new Error(`No status UUID provided for ${this.longname}`);
    }

    const latestValueEvent = this.getLatestValueEvent(statusUUID);
    const initialValue = latestValueEvent ? latestValueEvent.value === 1 : false;

    this.Endpoint.createDefaultGroupsClusterServer().createDefaultOnOffClusterServer(initialValue);

    this.addLoxoneCommandHandler('on');
    this.addLoxoneCommandHandler('off');
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent) {
    if (!(event instanceof LoxoneValueEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState() {
    const latestValueEvent = this.getLatestValueEvent(this.StatusUUIDs[0]);
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

export { OnOffDevice };
