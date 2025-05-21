import { airConditioner, bridgedNode, powerSource } from 'matterbridge';
import { FanControl, OnOff, TemperatureMeasurement, Thermostat } from 'matterbridge/matter/clusters';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { LoxonePlatform } from '../platform.js';
import { LoxoneDevice } from './LoxoneDevice.js';
import * as Converters from '../utils/Converters.js';

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

    const latestStateValueEvent = this.getLatestValueEvent(structureSection.states.status);
    const state = Converters.onOffValueConverter(latestStateValueEvent);
    const latestTargetTemperatureValueEvent = this.getLatestValueEvent(structureSection.states.targetTemperature);
    const latestCurrentTemperatureValueEvent = this.getLatestValueEvent(structureSection.states.temperature);
    const currentTemperature = Converters.temperatureValueConverter(latestCurrentTemperatureValueEvent);

    this.Endpoint.createDefaultGroupsClusterServer()
      .createDeadFrontOnOffClusterServer(state)
      .createDefaultThermostatClusterServer(latestCurrentTemperatureValueEvent?.value, latestTargetTemperatureValueEvent?.value, latestTargetTemperatureValueEvent?.value)
      .createDefaultThermostatUserInterfaceConfigurationClusterServer()
      .createDefaultFanControlClusterServer(FanControl.FanMode.Auto)
      .createDefaultTemperatureMeasurementClusterServer(currentTemperature);

    this.addLoxoneCommandHandler('on');
    this.addLoxoneCommandHandler('off');
    this.addLoxoneAttributeSubscription(Thermostat.Cluster.id, 'occupiedCoolingSetpoint', (newValue: number) => {
      const loxoneCommand = `setTarget/${Math.round(newValue / 100)}`;
      return loxoneCommand;
    });
    this.addLoxoneAttributeSubscription(Thermostat.Cluster.id, 'occupiedHeatingSetpoint', (newValue: number) => {
      const loxoneCommand = `setTarget/${Math.round(newValue / 100)}`;
      return loxoneCommand;
    });
    const systemModeMap = ['off', 'setMode/1', undefined, 'setMode/3', 'setMode/2', undefined, undefined, 'setMode/5', 'setMode/4'];
    this.addLoxoneAttributeSubscription(Thermostat.Cluster.id, 'systemMode', (newValue: Thermostat.SystemMode) => {
      const loxoneCommand = systemModeMap[newValue];
      return loxoneCommand;
    });
    this.addLoxoneAttributeSubscription(FanControl.Cluster.id, 'fanMode', (newValue: FanControl.FanMode) => {
      const loxoneCommands = newValue === FanControl.FanMode.Off ? 'off' : ['on', 'setFan/1'];
      return loxoneCommands;
    });
    this.addLoxoneAttributeSubscription(FanControl.Cluster.id, 'percentSetting', (newValue: number | null) => {
      const loxoneCommands = newValue === 0 || newValue === null ? 'off' : ['on', `setFan/1`];
      return loxoneCommands;
    });
  }

  override async handleLoxoneDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState() {
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
        const state = Converters.onOffValueConverter(event);
        await this.Endpoint.setAttribute(OnOff.Cluster.id, 'onOff', state, this.Endpoint.log);
        break;
      }
      case this.structureSection.states.targetTemperature: {
        const targetTemperature = Converters.temperatureValueConverter(event);
        await this.Endpoint.setAttribute(Thermostat.Cluster.id, 'occupiedCoolingSetpoint', targetTemperature, this.Endpoint.log);
        await this.Endpoint.setAttribute(Thermostat.Cluster.id, 'occupiedHeatingSetpoint', targetTemperature, this.Endpoint.log);
        break;
      }
      case this.structureSection.states.temperature: {
        const temperature = Converters.temperatureValueConverter(event);
        await this.Endpoint.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', temperature, this.Endpoint.log);
        await this.Endpoint.setAttribute(Thermostat.Cluster.id, 'localTemperature', temperature, this.Endpoint.log);
        break;
      }
      case this.structureSection.states.mode: {
        const mode = Converters.systemModeValueConverter(event);
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
