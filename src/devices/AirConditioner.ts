import { airConditioner, bridgedNode, MatterbridgeEndpoint, powerSource } from 'matterbridge';
import { FanControl, OnOff, TemperatureMeasurement, Thermostat } from 'matterbridge/matter/clusters';
import { LoxonePlatform } from '../platform.js';
import { LoxoneDevice, RegisterLoxoneDevice } from './LoxoneDevice.js';
import * as Converters from '../utils/Converters.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

const StateNames = {
  status: 'status',
  mode: 'mode',
  fan: 'fan',
  temperature: 'temperature',
  targetTemperature: 'targetTemperature',
  silentMode: 'silentMode',
} as const;
type StateNameType = (typeof StateNames)[keyof typeof StateNames];
const StateNameKeys = Object.values(StateNames) as StateNameType[];

class AirConditioner extends LoxoneDevice<StateNameType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      [airConditioner, bridgedNode, powerSource],
      StateNameKeys,
      'airconditioner',
      `${AirConditioner.name}_${control.structureSection.uuidAction.replace(/-/g, '_')}`,
    );

    const latestStateValueEvent = this.getLatestValueEvent(StateNames.status);
    const state = Converters.onOffValueConverter(latestStateValueEvent);
    const latestTargetTemperatureValueEvent = this.getLatestValueEvent(StateNames.targetTemperature);
    const latestCurrentTemperatureValueEvent = this.getLatestValueEvent(StateNames.temperature);
    const currentTemperature = Converters.numberValueConverter(latestCurrentTemperatureValueEvent);

    this.Endpoint = this.createDefaultEndpoint()
      .createDefaultGroupsClusterServer()
      .createDeadFrontOnOffClusterServer(state)
      .createDefaultThermostatClusterServer(latestCurrentTemperatureValueEvent.value, latestTargetTemperatureValueEvent.value, latestTargetTemperatureValueEvent.value)
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

  static override typeNames(): string[] {
    return ['airconditioner', 'ac'];
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent) {
    if (!(event instanceof LoxoneValueEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState() {
    for (const stateNameKey of StateNameKeys) {
      const latestValueEvent = this.getLatestValueEvent(stateNameKey);
      await this.updateAttributesFromLoxoneEvent(latestValueEvent);
    }
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent) {
    switch (event.state?.name) {
      case StateNames.status: {
        const state = Converters.onOffValueConverter(event);
        await this.Endpoint.updateAttribute(OnOff.Cluster.id, 'onOff', state, this.Endpoint.log);
        break;
      }
      case StateNames.targetTemperature: {
        const targetTemperature = Converters.numberValueConverter(event);
        await this.Endpoint.updateAttribute(Thermostat.Cluster.id, 'occupiedCoolingSetpoint', targetTemperature, this.Endpoint.log);
        await this.Endpoint.updateAttribute(Thermostat.Cluster.id, 'occupiedHeatingSetpoint', targetTemperature, this.Endpoint.log);
        break;
      }
      case StateNames.temperature: {
        const temperature = Converters.numberValueConverter(event);
        await this.Endpoint.updateAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', temperature, this.Endpoint.log);
        await this.Endpoint.updateAttribute(Thermostat.Cluster.id, 'localTemperature', temperature, this.Endpoint.log);
        break;
      }
      case StateNames.mode: {
        const mode = Converters.systemModeValueConverter(event);
        await this.Endpoint.updateAttribute(Thermostat.Cluster.id, 'systemMode', mode, this.Endpoint.log);
        break;
      }
      case StateNames.fan:
        await this.Endpoint.updateAttribute(FanControl.Cluster.id, 'fanMode', FanControl.FanMode.Auto, this.Endpoint.log);
        await this.Endpoint.updateAttribute(FanControl.Cluster.id, 'percentSetting', null, this.Endpoint.log);
        break;
      case StateNames.silentMode:
      default:
    }
  }
}

// register device with the registry
RegisterLoxoneDevice(AirConditioner);

export { AirConditioner };
