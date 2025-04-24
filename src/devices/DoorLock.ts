import { bridgedNode, powerSource, doorLockDevice } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { DoorLock } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';

class DoorLockDevice extends LoxoneDevice {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      [doorLockDevice, bridgedNode, powerSource],
      [structureSection.states.active],
      'door lock',
      `${DoorLockDevice.name}_${structureSection.uuidAction.replace(/-/g, '_')}`,
    );

    const latestValueEvent = this.getLatestValueEvent(structureSection.states.active);
    const value = this.valueConverter(latestValueEvent);

    this.Endpoint.createDefaultGroupsClusterServer().createDefaultDoorLockClusterServer(value);

    this.addLoxoneCommandHandler('lockDoor', () => 'off');
    this.addLoxoneCommandHandler('unlockDoor', () => 'on');
  }

  valueConverter(event: LoxoneValueUpdateEvent | undefined): DoorLock.LockState {
    return event ? (event.value === 1 ? DoorLock.LockState.Locked : DoorLock.LockState.Unlocked) : DoorLock.LockState.NotFullyLocked;
  }

  override async handleLoxoneDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async setState() {
    const latestValueEvent = this.getLatestValueEvent(this.structureSection.states.position);
    if (!latestValueEvent) {
      this.Endpoint.log.warn(`No initial value event found for ${this.longname}`);
      return;
    }

    await this.updateAttributesFromLoxoneEvent(latestValueEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueUpdateEvent) {
    const value = this.valueConverter(event);
    await this.Endpoint.setAttribute(DoorLock.Cluster.id, 'lockState', value, this.Endpoint.log);
  }
}

export { DoorLockDevice };
