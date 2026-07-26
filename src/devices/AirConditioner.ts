import {
  roomAirConditioner,
  bridgedNode,
  type MatterbridgeEndpoint,
  powerSource,
} from "matterbridge";
import {
  FanControl,
  OnOff,
  TemperatureMeasurement,
  Thermostat,
} from "matterbridge/matter/clusters";
import type { LoxonePlatform } from "../LoxonePlatform.js";
import { LoxoneDevice, RegisterLoxoneDevice } from "./LoxoneDevice.js";
import * as Converters from "../utils/Converters.js";
import LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type LoxoneTextEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";

const StateNames = {
  status: "status",
  mode: "mode",
  fan: "fan",
  temperature: "temperature",
  targetTemperature: "targetTemperature",
  silentMode: "silentMode",
} as const;
type StateNameType = (typeof StateNames)[keyof typeof StateNames];
const StateNameKeys = Object.values(StateNames) as StateNameType[];

class AirConditioner extends LoxoneDevice<StateNameType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      [roomAirConditioner, bridgedNode, powerSource],
      StateNameKeys,
      "airconditioner",
      `${AirConditioner.name}_${control.structureSection.uuidAction.replace(/-/g, "_")}`,
    );

    const latestStateValueEvent = this.getLatestValueEvent(StateNames.status);
    const state = Converters.onOffValueConverter(latestStateValueEvent);
    const latestTargetTemperatureValueEvent = this.getLatestValueEvent(
      StateNames.targetTemperature,
    );
    const latestCurrentTemperatureValueEvent = this.getLatestValueEvent(StateNames.temperature);
    const currentTemperature = Converters.numberValueConverter(latestCurrentTemperatureValueEvent);

    this.Endpoint = this.createDefaultEndpoint()
      .createDefaultGroupsClusterServer()
      .createDeadFrontOnOffClusterServer(state)
      .createDefaultThermostatClusterServer(
        latestCurrentTemperatureValueEvent.value,
        latestTargetTemperatureValueEvent.value,
        latestTargetTemperatureValueEvent.value,
      )
      .createDefaultThermostatUserInterfaceConfigurationClusterServer()
      .createDefaultFanControlClusterServer()
      .createDefaultTemperatureMeasurementClusterServer(currentTemperature);

    this.addLoxoneCommandHandler("on");
    this.addLoxoneCommandHandler("off");
    this.addLoxoneAttributeSubscription(
      Thermostat.id,
      "occupiedCoolingSetpoint",
      (newValue: number) => {
        const loxoneCommand = `setTarget/${Math.round(newValue / 100)}`;
        return loxoneCommand;
      },
    );
    this.addLoxoneAttributeSubscription(
      Thermostat.id,
      "occupiedHeatingSetpoint",
      (newValue: number) => {
        const loxoneCommand = `setTarget/${Math.round(newValue / 100)}`;
        return loxoneCommand;
      },
    );
    const systemModeMap = [
      "off",
      "setMode/1",
      undefined,
      "setMode/3",
      "setMode/2",
      undefined,
      undefined,
      "setMode/5",
      "setMode/4",
    ];
    this.addLoxoneAttributeSubscription(
      Thermostat.id,
      "systemMode",
      (newValue: Thermostat.SystemMode) => {
        const loxoneCommand = systemModeMap[newValue];
        return loxoneCommand;
      },
    );
    this.addLoxoneAttributeSubscription(
      FanControl.id,
      "fanMode",
      (newValue: FanControl.FanMode) => {
        const loxoneCommands = newValue === FanControl.FanMode.Off ? "off" : ["on", "setFan/1"];
        return loxoneCommands;
      },
    );
    this.addLoxoneAttributeSubscription(
      FanControl.id,
      "percentSetting",
      (newValue: number | null) => {
        const loxoneCommands = newValue === 0 || newValue === null ? "off" : ["on", `setFan/1`];
        return loxoneCommands;
      },
    );
  }

  static override typeNames(): string[] {
    return ["airconditioner", "ac"];
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void> {
    if (!(event instanceof LoxoneValueEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState(): Promise<void> {
    for (const stateNameKey of StateNameKeys) {
      const latestValueEvent = this.getLatestValueEvent(stateNameKey);
      await this.updateAttributesFromLoxoneEvent(latestValueEvent);
    }
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent): Promise<void> {
    switch (event.state?.name) {
      case StateNames.status: {
        const state = Converters.onOffValueConverter(event);
        await this.Endpoint.updateAttribute(OnOff.id, "onOff", state, this.Endpoint.log);
        break;
      }
      case StateNames.targetTemperature: {
        const targetTemperature = Converters.numberValueConverter(event);
        await this.Endpoint.updateAttribute(
          Thermostat.id,
          "occupiedCoolingSetpoint",
          targetTemperature,
          this.Endpoint.log,
        );
        await this.Endpoint.updateAttribute(
          Thermostat.id,
          "occupiedHeatingSetpoint",
          targetTemperature,
          this.Endpoint.log,
        );
        break;
      }
      case StateNames.temperature: {
        const temperature = Converters.numberValueConverter(event);
        await this.Endpoint.updateAttribute(
          TemperatureMeasurement.id,
          "measuredValue",
          temperature,
          this.Endpoint.log,
        );
        await this.Endpoint.updateAttribute(
          Thermostat.id,
          "localTemperature",
          temperature,
          this.Endpoint.log,
        );
        break;
      }
      case StateNames.mode: {
        const mode = Converters.systemModeValueConverter(event);
        await this.Endpoint.updateAttribute(Thermostat.id, "systemMode", mode, this.Endpoint.log);
        break;
      }
      case StateNames.fan:
        await this.Endpoint.updateAttribute(
          FanControl.id,
          "fanMode",
          FanControl.FanMode.Auto,
          this.Endpoint.log,
        );
        await this.Endpoint.updateAttribute(
          FanControl.id,
          "percentSetting",
          null,
          this.Endpoint.log,
        );
        break;
      case StateNames.silentMode:
      default:
    }
  }
}

// register device with the registry
RegisterLoxoneDevice(AirConditioner);

export { AirConditioner };
