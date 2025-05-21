import { airConditioner, bridgedNode, powerSource } from 'matterbridge';
import { FanControl, OnOff, TemperatureMeasurement, Thermostat } from 'matterbridge/matter/clusters';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { LoxonePlatform } from '../platform.js';
import { LoxoneDevice } from './LoxoneDevice.js';

class AirConditioner extends LoxoneDevice {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      [airConditioner, bridgedNode, powerSource],
      [
        structureSection.states.status,
        structureSection.states.mode,
        structureSection.states.fan,
        structureSection.states.temperature,
        structureSection.states.targetTemperature,
        structureSection.states.silentMode,
      ],
      'airconditioner',
      `${AirConditioner.name}_${structureSection.uuidAction.replace(/-/g, '_')}`,
    );

    const latestValueEvent = this.getLatestValueEvent(structureSection.states.status);
    const value = this.onOffValueConverter(latestValueEvent);

    this.Endpoint.createDefaultGroupsClusterServer()
      .createDeadFrontOnOffClusterServer(value)
      .createDefaultThermostatClusterServer(20, 18, 22)
      .createDefaultThermostatUserInterfaceConfigurationClusterServer()
      .createDefaultFanControlClusterServer(FanControl.FanMode.Auto)
      .createDefaultTemperatureMeasurementClusterServer(20 * 100);

    this.addLoxoneCommandHandler('on');
    this.addLoxoneCommandHandler('off');
    this.addLoxoneAttributeSubscription(Thermostat.Cluster.id, 'occupiedCoolingSetpoint', (newValue: number) => {
      const loxoneCommand = `setTarget/${Math.round(newValue / 100)}`;
      return loxoneCommand;
    });
    this.addLoxoneAttributeSubscription(Thermostat.Cluster.id, 'systemMode', (newValue: number) => {
      let loxoneCommand;
      switch (newValue) {
        case Thermostat.SystemMode.Auto:
          loxoneCommand = 'setMode/1';
          break;
        case Thermostat.SystemMode.Heat:
          loxoneCommand = 'setMode/2';
          break;
        case Thermostat.SystemMode.Cool:
          loxoneCommand = 'setMode/3';
          break;
        case Thermostat.SystemMode.Dry:
          loxoneCommand = 'setMode/4';
          break;
        case Thermostat.SystemMode.FanOnly:
          loxoneCommand = 'setMode/5';
          break;
        case Thermostat.SystemMode.Off:
          loxoneCommand = undefined;
          break;
      }
      return loxoneCommand;
    });
  }

  override async handleLoxoneDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  onOffValueConverter(event: LoxoneValueUpdateEvent | undefined): boolean {
    return event ? (event.value === 1 ? true : false) : false;
  }

  temperatureValueConverter(event: LoxoneValueUpdateEvent | undefined): number {
    return event ? event.value * 100 : 0;
  }

  systemModeValueConverter(event: LoxoneValueUpdateEvent | undefined): Thermostat.SystemMode {
    switch (event?.value) {
      case 1:
        return Thermostat.SystemMode.Auto;
      case 2:
        return Thermostat.SystemMode.Heat;
      case 3:
        return Thermostat.SystemMode.Cool;
      case 4:
        return Thermostat.SystemMode.Dry;
      case 5:
        return Thermostat.SystemMode.FanOnly;
      default:
        return Thermostat.SystemMode.Off;
    }
  }

  override async setState() {
    for (const status of this.StatusUUIDs) {
      const latestValueEvent = this.getLatestValueEvent(status);
      if (!latestValueEvent) {
        this.Endpoint.log.warn(`No initial value event found for ${this.longname}`);
        return;
      }
      await this.updateAttributesFromLoxoneEvent(latestValueEvent);
    }
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueUpdateEvent) {
    switch (event.uuid) {
      case this.structureSection.states.status: {
        const state = this.onOffValueConverter(event);
        await this.Endpoint.setAttribute(OnOff.Cluster.id, 'onOff', state, this.Endpoint.log);
        break;
      }
      case this.structureSection.states.targetTemperature: {
        const targetTemperature = this.temperatureValueConverter(event);
        await this.Endpoint.setAttribute(Thermostat.Cluster.id, 'occupiedCoolingSetpoint', targetTemperature, this.Endpoint.log);
        break;
      }
      case this.structureSection.states.temperature: {
        const temperature = this.temperatureValueConverter(event);
        await this.Endpoint.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', temperature, this.Endpoint.log);
        await this.Endpoint.setAttribute(Thermostat.Cluster.id, 'localTemperature', temperature, this.Endpoint.log);
        break;
      }
      case this.structureSection.states.mode: {
        const mode = this.systemModeValueConverter(event);
        await this.Endpoint.setAttribute(Thermostat.Cluster.id, 'systemMode', mode, this.Endpoint.log);
        break;
      }
      case this.structureSection.states.fan:
      case this.structureSection.states.silentMode:
      default:
    }
  }
}

export { AirConditioner };
