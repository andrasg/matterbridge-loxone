import { bridgedNode, type MatterbridgeEndpoint, powerSource, smokeCoAlarm } from "matterbridge";
import type { LoxonePlatform } from "../LoxonePlatform.js";
import { SmokeCoAlarm } from "matterbridge/matter/clusters";
import { LoxoneDevice, RegisterLoxoneDevice } from "./LoxoneDevice.js";
import LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type LoxoneTextEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";
import {
  ActiveOnlyStateNameKeys,
  ActiveOnlyStateNames,
  type ActiveOnlyStateNamesType,
} from "./SingleDataPointSensor.js";
import { alarmStateValueConverter } from "../utils/Converters.js";

class CoAlarm extends LoxoneDevice<ActiveOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      [smokeCoAlarm, bridgedNode, powerSource],
      ActiveOnlyStateNameKeys,
      "co alarm",
      `${CoAlarm.name}_${control.structureSection.uuidAction.replace(/-/g, "_")}`,
    );

    const latestValue = this.getLatestValueEvent(ActiveOnlyStateNames.active);
    const alarmState: SmokeCoAlarm.AlarmState = alarmStateValueConverter(latestValue);

    this.Endpoint = this.createDefaultEndpoint().createCoOnlySmokeCOAlarmClusterServer(alarmState);
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void> {
    if (!(event instanceof LoxoneValueEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState(): Promise<void> {
    const latestValue = this.getLatestValueEvent(ActiveOnlyStateNames.active);
    await this.updateAttributesFromLoxoneEvent(latestValue);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent): Promise<void> {
    const alarmState: SmokeCoAlarm.AlarmState = alarmStateValueConverter(event);
    await this.Endpoint.updateAttribute(SmokeCoAlarm.id, "coState", alarmState, this.Endpoint.log);
  }

  static override typeNames(): string[] {
    return ["co", "cosensor"];
  }
}

RegisterLoxoneDevice(CoAlarm);

export { CoAlarm };
