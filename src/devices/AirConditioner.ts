import { airConditioner, bridgedNode, powerSource } from 'matterbridge';
import { FanControl, OnOff, TemperatureMeasurement, Thermostat } from 'matterbridge/matter/clusters';
import { LoxonePlatform } from '../platform.js';
import { LoxoneDevice } from './LoxoneDevice.js';
import * as Converters from '../utils/Converters.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

class AirConditioner extends LoxoneDevice {
  override states: Record<'status' | 'mode' | 'fan' | 'temperature' | 'targetTemperature' | 'silentMode', string>;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      [airConditioner, bridgedNode, powerSource],
      [
        control.structureSection.states.status,
        control.structureSection.states.mode,
        control.structureSection.states.fan,
        control.structureSection.states.temperature,
        control.structureSection.states.targetTemperature,
        control.structureSection.states.silentMode,
      ],
      'airconditioner',
      `${AirConditioner.name}_${control.structureSection.uuidAction.replace(/-/g, '_')}`,
    );
    this.states = control.structureSection.states;

    const latestStateValueEvent = this.getLatestValueEvent(control.structureSection.states.status);
    const state = Converters.onOffValueConverter(latestStateValueEvent);
    const latestTargetTemperatureValueEvent = this.getLatestValueEvent(control.structureSection.states.targetTemperature);
    const latestCurrentTemperatureValueEvent = this.getLatestValueEvent(control.structureSection.states.temperature);
    const currentTemperature = Converters.temperatureValueConverter(latestCurrentTemperatureValueEvent);

    this.Endpoint.createDefaultGroupsClusterServer()
      .createDeadFrontOnOffClusterServer(state)
      .createDefaultThermostatClusterServer(latestCurrentTemperatureValueEvent?.value, latestTargetTemperatureValueEvent?.value, latestTargetTemperatureValueEvent?.value)
      .createDefaultThermostatUserInterfaceConfigurationClusterServer()
      .createDefaultFanControlClusterServer()
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

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent) {
    if (!(event instanceof LoxoneValueEvent)) return;

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

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent) {
    switch (event.uuid.stringValue) {
      case this.states.status: {
        const state = Converters.onOffValueConverter(event);
        await this.Endpoint.updateAttribute(OnOff.Cluster.id, 'onOff', state, this.Endpoint.log);
        break;
      }
      case this.states.targetTemperature: {
        const targetTemperature = Converters.temperatureValueConverter(event);
        await this.Endpoint.updateAttribute(Thermostat.Cluster.id, 'occupiedCoolingSetpoint', targetTemperature, this.Endpoint.log);
        await this.Endpoint.updateAttribute(Thermostat.Cluster.id, 'occupiedHeatingSetpoint', targetTemperature, this.Endpoint.log);
        break;
      }
      case this.states.temperature: {
        const temperature = Converters.temperatureValueConverter(event);
        await this.Endpoint.updateAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', temperature, this.Endpoint.log);
        await this.Endpoint.updateAttribute(Thermostat.Cluster.id, 'localTemperature', temperature, this.Endpoint.log);
        break;
      }
      case this.states.mode: {
        const mode = Converters.systemModeValueConverter(event);
        await this.Endpoint.updateAttribute(Thermostat.Cluster.id, 'systemMode', mode, this.Endpoint.log);
        break;
      }
      case this.states.fan:
        await this.Endpoint.updateAttribute(FanControl.Cluster.id, 'fanMode', FanControl.FanMode.Auto, this.Endpoint.log);
        await this.Endpoint.updateAttribute(FanControl.Cluster.id, 'percentSetting', null, this.Endpoint.log);
        break;
      case this.states.silentMode:
      default:
    }
  }
}

export { AirConditioner };
