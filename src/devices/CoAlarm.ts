import { bridgedNode, type MatterbridgeEndpoint, powerSource, smokeCoAlarm } from "matterbridge";
import type { DeviceHost } from "./DeviceHost.js";
import { SmokeCoAlarm } from "matterbridge/matter/clusters";
import { LoxoneDevice } from "./LoxoneDevice.js";
import LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type LoxoneTextEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";
import { ACTIVE_ONLY_STATE_NAMES, type ActiveOnlyStateNamesType } from "./SingleDataPointSensor.js";
import { alarmStateValueConverter } from "../utils/Converters.js";

class CoAlarm extends LoxoneDevice<ActiveOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, host: DeviceHost) {
    super(
      control,
      host,
      [smokeCoAlarm, bridgedNode, powerSource],
      ACTIVE_ONLY_STATE_NAMES,
      "co alarm",
      `${CoAlarm.name}_${control.structureSection.uuidAction.replace(/-/g, "_")}`,
    );

    const latestValue = this.getLatestValueEvent("active");
    const alarmState: SmokeCoAlarm.AlarmState = alarmStateValueConverter(latestValue);

    this.Endpoint = this.createDefaultEndpoint().createCoOnlySmokeCOAlarmClusterServer(alarmState);
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void> {
    if (!(event instanceof LoxoneValueEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState(): Promise<void> {
    const latestValue = this.getLatestValueEvent("active");
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

export { CoAlarm };
