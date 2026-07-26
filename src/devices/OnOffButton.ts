import {
  bridgedNode,
  powerSource,
  mountedOnOffControl,
  type MatterbridgeEndpoint,
} from "matterbridge";
import type { LoxonePlatform } from "../LoxonePlatform.js";
import { OnOff } from "matterbridge/matter/clusters";
import { LoxoneDevice, RegisterLoxoneDevice } from "./LoxoneDevice.js";
import LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type LoxoneTextEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";
import {
  ActiveOnlyStateNameKeys,
  ActiveOnlyStateNames,
  type ActiveOnlyStateNamesType,
} from "./SingleDataPointSensor.js";

class OnOffButton extends LoxoneDevice<ActiveOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      [mountedOnOffControl, bridgedNode, powerSource],
      ActiveOnlyStateNameKeys,
      "button",
      `${OnOffButton.name}_${control.structureSection.uuidAction.replace(/-/g, "_")}`,
    );

    const latestValueEvent = this.getLatestValueEvent(ActiveOnlyStateNames.active);
    const initialValue = latestValueEvent ? latestValueEvent.value === 1 : false;

    this.Endpoint = this.createDefaultEndpoint()
      .createDefaultGroupsClusterServer()
      .createDefaultOnOffClusterServer(initialValue);

    this.addLoxoneCommandHandler("on", () => {
      setTimeout(async () => {
        await this.Endpoint.updateAttribute(OnOff.id, "onOff", false, this.Endpoint.log);
      }, 1000);
      return "pulse";
    });
    this.addLoxoneCommandHandler("off");
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void> {
    if (!(event instanceof LoxoneValueEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState(): Promise<void> {
    const latestValueEvent = this.getLatestValueEvent(ActiveOnlyStateNames.active);
    await this.updateAttributesFromLoxoneEvent(latestValueEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent): Promise<void> {
    await this.Endpoint.updateAttribute(OnOff.id, "onOff", event.value === 1, this.Endpoint.log);
  }

  static override typeNames(): string[] {
    return ["button"];
  }
}

RegisterLoxoneDevice(OnOffButton);

export { OnOffButton };
