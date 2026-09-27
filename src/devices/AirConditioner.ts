import type LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import type Control from 'loxone-ts-api/dist/Structure/Control.js';
import { roomAirConditioner, bridgedNode, type MatterbridgeEndpoint, powerSource } from 'matterbridge';
import { FanControl, OnOff, TemperatureMeasurement, Thermostat } from 'matterbridge/matter/clusters';

import { onOffValueConverter, numberValueConverter, systemModeValueConverter } from '../utils/Converters.js';
import type { DeviceHost } from './DeviceHost.js';
import { LoxoneDevice } from './LoxoneDevice.js';

const STATE_NAMES = ['status', 'mode', 'fan', 'temperature', 'targetTemperature', 'silentMode'] as const;
type StateNameType = (typeof STATE_NAMES)[number];

class AirConditioner extends LoxoneDevice<StateNameType> {
  public Endpoint: MatterbridgeEndpoint;
  private readonly fanSpeeds: number[];
  private readonly manualFanSpeeds: number[];
  private isOn: boolean;
  private fanSpeed: number;
  private fanCommandQueue: Promise<null> = Promise.resolve(null);

  constructor(control: Control, host: DeviceHost) {
    super(
      control,
      host,
      [roomAirConditioner, bridgedNode, powerSource],
      STATE_NAMES,
      'airconditioner',
      `${AirConditioner.name}_${control.structureSection.uuidAction.replace(/-/g, '_')}`,
    );

    const fanSpeedDetails: unknown = control.structureSection.details?.fanspeed;
    if (!Array.isArray(fanSpeedDetails)) throw new Error(`Missing fan-speed capabilities for ${this.longname}`);
    this.fanSpeeds = [
      ...new Set(
        fanSpeedDetails.flatMap((entry: unknown) => {
          if (typeof entry !== 'object' || entry === null || !('id' in entry) || !('used' in entry)) return [];
          if (entry.used !== true || typeof entry.id !== 'number' || !Number.isInteger(entry.id) || entry.id < 0) return [];
          return [entry.id];
        }),
      ),
    ].toSorted((first, second) => first - second);
    this.manualFanSpeeds = this.fanSpeeds.filter((speed) => speed > 1);
    if (this.manualFanSpeeds.length === 0 || this.manualFanSpeeds.length > 100) throw new Error(`Expected 1-100 supported manual fan speeds for ${this.longname}`);

    const latestStateValueEvent = this.getLatestValueEvent('status');
    const state = onOffValueConverter(latestStateValueEvent);
    this.isOn = state;
    this.fanSpeed = this.getLatestValueEvent('fan').value;
    const latestTargetTemperatureValueEvent = this.getLatestValueEvent('targetTemperature');
    const latestCurrentTemperatureValueEvent = this.getLatestValueEvent('temperature');
    const currentTemperature = numberValueConverter(latestCurrentTemperatureValueEvent);

    this.Endpoint = this.createDefaultEndpoint()
      .createDefaultGroupsClusterServer()
      .createDeadFrontOnOffClusterServer(state)
      .createDefaultThermostatClusterServer(latestCurrentTemperatureValueEvent.value, latestTargetTemperatureValueEvent.value, latestTargetTemperatureValueEvent.value)
      .createDefaultThermostatUserInterfaceConfigurationClusterServer()
      .createDefaultTemperatureMeasurementClusterServer(currentTemperature);

    if (this.fanSpeeds.includes(1)) {
      this.Endpoint.createDefaultFanControlClusterServer(FanControl.FanMode.Off, this.fanModeSequence);
    } else {
      this.Endpoint.createBaseFanControlClusterServer(FanControl.FanMode.Off, this.fanModeSequence);
    }

    this.addLoxoneCommandHandler('on');
    this.addLoxoneCommandHandler('off');
    this.addLoxoneAttributeSubscription(Thermostat.id, 'occupiedCoolingSetpoint', (newValue: number, _oldValue: number, context) => {
      const loxoneCommand = `setTarget/${Math.round(newValue / 100)}`;
      return context.fabric === undefined ? undefined : loxoneCommand;
    });
    this.addLoxoneAttributeSubscription(Thermostat.id, 'occupiedHeatingSetpoint', (newValue: number, _oldValue: number, context) => {
      const loxoneCommand = `setTarget/${Math.round(newValue / 100)}`;
      return context.fabric === undefined ? undefined : loxoneCommand;
    });
    const systemModeMap = ['off', 'setMode/1', undefined, 'setMode/3', 'setMode/2', undefined, undefined, 'setMode/5', 'setMode/4'];
    this.addLoxoneAttributeSubscription(Thermostat.id, 'systemMode', (newValue: Thermostat.SystemMode, _oldValue: Thermostat.SystemMode, context) => {
      const loxoneCommand = systemModeMap[newValue];
      return context.fabric === undefined ? undefined : loxoneCommand;
    });
    if (!this.fanSpeeds.includes(1)) {
      this.Endpoint.subscribeAttribute(
        FanControl.id,
        'fanMode',
        (newValue: FanControl.FanMode, _oldValue: FanControl.FanMode, context) => {
          if (context.fabric === undefined) return;
          this.queueFanCommands(this.formatFanModeCommand(newValue));
        },
        this.Endpoint.log,
      );
    }
    this.Endpoint.subscribeAttribute(
      FanControl.id,
      'percentSetting',
      (newValue: number | null, _oldValue: number | null, context) => {
        if (context.fabric === undefined) return;
        this.queueFanCommands(this.formatFanPercentCommand(newValue));
      },
      this.Endpoint.log,
    );
  }

  static override typeNames(): string[] {
    return ['airconditioner', 'ac'];
  }

  private get fanModeSequence(): FanControl.FanModeSequence {
    if (this.manualFanSpeeds.length === 1) return this.fanSpeeds.includes(1) ? FanControl.FanModeSequence.OffHighAuto : FanControl.FanModeSequence.OffHigh;
    if (this.manualFanSpeeds.length === 2) return this.fanSpeeds.includes(1) ? FanControl.FanModeSequence.OffLowHighAuto : FanControl.FanModeSequence.OffLowHigh;
    return this.fanSpeeds.includes(1) ? FanControl.FanModeSequence.OffLowMedHighAuto : FanControl.FanModeSequence.OffLowMedHigh;
  }

  private get manualFanModes(): FanControl.FanMode[] {
    if (this.manualFanSpeeds.length === 1) return [FanControl.FanMode.High];
    if (this.manualFanSpeeds.length === 2) return [FanControl.FanMode.Low, FanControl.FanMode.High];
    return [FanControl.FanMode.Low, FanControl.FanMode.Medium, FanControl.FanMode.High];
  }

  private formatFanModeCommand(mode: FanControl.FanMode): string | string[] | undefined {
    if (mode === FanControl.FanMode.Off) return this.formatFanPercentCommand(0);
    const modeIndex = this.manualFanModes.indexOf(mode);
    if (modeIndex < 0) this.Endpoint.log.warn(`Unsupported fan mode ${mode} for ${this.longname}`);
    const start = Math.floor((100 * modeIndex) / this.manualFanModes.length) + 1;
    const end = Math.floor((100 * (modeIndex + 1)) / this.manualFanModes.length);
    const percent = Math.round((start + end) / 2);
    return modeIndex < 0 ? undefined : this.formatFanPercentCommand(percent);
  }

  private formatFanPercentCommand(percent: number | null): string | string[] | undefined {
    if (percent === 0) return this.fanSpeeds.includes(0) ? 'setFan/0' : 'off';
    let speed: number | undefined;
    if (percent === null) {
      speed = this.fanSpeeds.includes(1) ? 1 : undefined;
    } else if (Number.isFinite(percent) && percent > 0 && percent <= 100) {
      speed = this.manualFanSpeeds[Math.ceil((percent * this.manualFanSpeeds.length) / 100) - 1];
    }
    if (speed === undefined) this.Endpoint.log.warn(`Unsupported fan percentage ${percent} for ${this.longname}`);
    return speed === undefined ? undefined : ['on', `setFan/${speed}`];
  }

  private queueFanCommands(commands: string | string[] | undefined): void {
    if (commands === undefined) return;
    const commandList = Array.isArray(commands) ? commands : [commands];
    this.fanCommandQueue = this.fanCommandQueue
      .then(async () => {
        for (const command of commandList) {
          this.Endpoint.log.info(`Calling Loxone API command '${command}'`);
          await this.host.sendControlCommand(this.control.uuidAction, command);
        }
        return null;
      })
      .catch((error: unknown) => {
        this.Endpoint.log.error(`Error calling Loxone fan command: ${String(error)}`);
        return null;
      });
  }

  private async updateFanAttributes(): Promise<void> {
    if (!this.isOn || this.fanSpeed === 0) {
      await this.Endpoint.setCluster(FanControl.id, { fanMode: FanControl.FanMode.Off, percentSetting: 0, percentCurrent: 0 }, this.Endpoint.log);
      return;
    }
    if (!this.fanSpeeds.includes(this.fanSpeed)) {
      this.Endpoint.log.warn(`Unsupported Loxone fan speed ${this.fanSpeed} for ${this.longname}`);
      return;
    }
    if (this.fanSpeed === 1) {
      await this.Endpoint.setCluster(FanControl.id, { fanMode: FanControl.FanMode.Auto, percentSetting: null }, this.Endpoint.log);
      return;
    }
    const percent = Math.floor((100 * (this.manualFanSpeeds.indexOf(this.fanSpeed) + 1)) / this.manualFanSpeeds.length);
    const mode = this.manualFanModes[Math.ceil((percent * this.manualFanModes.length) / 100) - 1];
    await this.Endpoint.setCluster(FanControl.id, { fanMode: mode, percentSetting: percent, percentCurrent: percent }, this.Endpoint.log);
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void> {
    if (!(event instanceof LoxoneValueEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState(): Promise<void> {
    for (const stateNameKey of STATE_NAMES) {
      const latestValueEvent = this.getLatestValueEvent(stateNameKey);
      await this.updateAttributesFromLoxoneEvent(latestValueEvent);
    }
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent): Promise<void> {
    switch (this.stateNameOf(event)) {
      case 'status': {
        const state = onOffValueConverter(event);
        this.isOn = state;
        await this.Endpoint.updateAttribute(OnOff.id, 'onOff', state, this.Endpoint.log);
        await this.updateFanAttributes();
        break;
      }
      case 'targetTemperature': {
        const targetTemperature = numberValueConverter(event);
        await this.Endpoint.updateAttribute(Thermostat.id, 'occupiedCoolingSetpoint', targetTemperature, this.Endpoint.log);
        await this.Endpoint.updateAttribute(Thermostat.id, 'occupiedHeatingSetpoint', targetTemperature, this.Endpoint.log);
        break;
      }
      case 'temperature': {
        const temperature = numberValueConverter(event);
        await this.Endpoint.updateAttribute(TemperatureMeasurement.id, 'measuredValue', temperature, this.Endpoint.log);
        await this.Endpoint.updateAttribute(Thermostat.id, 'localTemperature', temperature, this.Endpoint.log);
        break;
      }
      case 'mode': {
        const mode = systemModeValueConverter(event);
        await this.Endpoint.updateAttribute(Thermostat.id, 'systemMode', mode, this.Endpoint.log);
        break;
      }
      case 'fan':
        this.fanSpeed = event.value;
        await this.updateFanAttributes();
        break;
      case 'silentMode':
      default:
    }
  }
}

export { AirConditioner };
