import { bridgedNode, type MatterbridgeEndpoint, powerSource, smokeCoAlarm } from "matterbridge";
import type { LoxonePlatform } from "../LoxonePlatform.js";
import { SmokeCoAlarm } from "matterbridge/matter/clusters";
import { LoxoneDevice, RegisterLoxoneDevice } from "./LoxoneDevice.js";
import LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type LoxoneTextEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";

const StateNames = {
  level: "level",
  alarmCause: "alarmCause",
} as const;
type StateNameType = (typeof StateNames)[keyof typeof StateNames];
const StateNameKeys = Object.values(StateNames) as StateNameType[];

class SmokeAlarm extends LoxoneDevice<StateNameType> {
  public Endpoint: MatterbridgeEndpoint;
  private cause = 0;
  private level = 0;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      [smokeCoAlarm, bridgedNode, powerSource],
      StateNameKeys,
      "smoke alarm",
      `${SmokeAlarm.name}_${control.structureSection.uuidAction.replace(/-/g, "_")}`,
    );

    // oxlint-disable-next-line no-bitwise
    const supportsSmoke = control.structureSection.details.availableAlarms & 0x01;
    if (!supportsSmoke) throw new Error(`Control ${control.name} does not support smoke alarms.`);

    const latestCause = this.getLatestValueEvent(StateNames.level);
    const latestLevel = this.getLatestValueEvent(StateNames.alarmCause);

    this.cause = latestCause ? latestCause.value : 0;
    this.level = latestLevel ? latestLevel.value : 0;

    const alarmState = this.calculateAlarmState();

    this.Endpoint =
      this.createDefaultEndpoint().createSmokeOnlySmokeCOAlarmClusterServer(alarmState);
  }

  private calculateAlarmState(): SmokeCoAlarm.AlarmState {
    // oxlint-disable-next-line no-bitwise
    const isAlarm = (this.cause & 0x01) === 1 && this.level === 1;
    const alarmState = isAlarm ? SmokeCoAlarm.AlarmState.Critical : SmokeCoAlarm.AlarmState.Normal;
    return alarmState;
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void> {
    if (!(event instanceof LoxoneValueEvent)) return;

    switch (event.state?.name) {
      case StateNames.level:
        this.level = event.value;
        break;
      case StateNames.alarmCause:
        this.cause = event.value;
        break;
      default:
        this.Endpoint.log.warn(
          `Received unexpected event for state ${event.state?.name} on device ${this.longname}`,
        );
        return;
    }

    await this.updateAttributesFromInternalState();
  }

  override async populateInitialState(): Promise<void> {
    const latestCause = this.getLatestValueEvent(StateNames.alarmCause);
    const latestLevel = this.getLatestValueEvent(StateNames.level);

    this.cause = latestCause.value;
    this.level = latestLevel.value;

    await this.updateAttributesFromInternalState();
  }

  private async updateAttributesFromInternalState(): Promise<void> {
    const alarmState = this.calculateAlarmState();
    await this.Endpoint.updateAttribute(
      SmokeCoAlarm.id,
      "smokeState",
      alarmState,
      this.Endpoint.log,
    );
  }

  static override typeNames(): string[] {
    return ["smoke", "smokesensor"];
  }
}

RegisterLoxoneDevice(SmokeAlarm);

export { SmokeAlarm };
