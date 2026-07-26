import { bridgedNode, powerSource, genericSwitch, type MatterbridgeEndpoint } from "matterbridge";
import type { LoxonePlatform } from "../LoxonePlatform.js";
import { LoxoneDevice, RegisterLoxoneDevice } from "./LoxoneDevice.js";
import LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type LoxoneTextEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";
import { ActiveOnlyStateNameKeys, type ActiveOnlyStateNamesType } from "./SingleDataPointSensor.js";

class PushButton extends LoxoneDevice<ActiveOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      [genericSwitch, bridgedNode, powerSource],
      ActiveOnlyStateNameKeys,
      "button",
      `${genericSwitch.name}_${control.structureSection.uuidAction.replace(/-/g, "_")}`,
    );

    this.Endpoint = this.createDefaultEndpoint()
      .createDefaultGroupsClusterServer()
      .createDefaultSwitchClusterServer();
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void> {
    if (!(event instanceof LoxoneValueEvent)) return;

    if (event.value === 1) {
      await this.Endpoint.triggerSwitchEvent("Single", this.Endpoint.log);
    }
  }

  // oxlint-disable-next-line typescript/require-await
  override async populateInitialState(): Promise<void> {
    this.Endpoint.log.info(
      `PushButton ${this.longname} does not have an initial state to populate.`,
    );
  }

  static override typeNames(): string[] {
    return ["pushbutton"];
  }
}

RegisterLoxoneDevice(PushButton);

export { PushButton };
