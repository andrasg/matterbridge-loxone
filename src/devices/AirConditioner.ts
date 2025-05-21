import { bridgedNode, powerSource, airConditioner } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { OnOff, FanControl } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';

class AirConditioner extends LoxoneDevice {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      [airConditioner, bridgedNode, powerSource],
      [structureSection.states.status, structureSection.states.mode, structureSection.states.fan, structureSection.states.temperature, structureSection.states.targetTemperature],
      'airconditioner',
      `${AirConditioner.name}_${structureSection.uuidAction.replace(/-/g, '_')}`,
    );

    const latestValueEvent = this.getLatestValueEvent(structureSection.states.status);
    const value = this.valueConverter(latestValueEvent);

    this.Endpoint.createDefaultGroupsClusterServer()
      .createDeadFrontOnOffClusterServer(value)
      .createDefaultThermostatClusterServer(20, 18, 22)
      .createDefaultThermostatUserInterfaceConfigurationClusterServer()
      .createDefaultFanControlClusterServer(FanControl.FanMode.Auto)
      .createDefaultTemperatureMeasurementClusterServer(20 * 100);

    this.addLoxoneCommandHandler('on');
    this.addLoxoneCommandHandler('off');
  }

  override async handleLoxoneDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  valueConverter(event: LoxoneValueUpdateEvent | undefined): boolean {
    return event ? (event.value === 1 ? true : false) : false;
  }

  override async setState() {
    const latestValueEvent = this.getLatestValueEvent(this.structureSection.states.status);
    if (!latestValueEvent) {
      this.Endpoint.log.warn(`No initial value event found for ${this.longname}`);
      return;
    }

    await this.updateAttributesFromLoxoneEvent(latestValueEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueUpdateEvent) {
    const state = this.valueConverter(event);
    await this.Endpoint.setAttribute(OnOff.Cluster.id, 'onOff', state, this.Endpoint.log);
  }
}

export { AirConditioner };
