import {
  bridgedNode,
  powerSource,
  onOffLightSwitch,
  type MatterbridgeEndpoint,
} from "matterbridge";
import type { DeviceHost } from "./DeviceHost.js";
import { OnOff } from "matterbridge/matter/clusters";
import { LoxoneDevice } from "./LoxoneDevice.js";
import LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type LoxoneTextEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";
import { ACTIVE_ONLY_STATE_NAMES, type ActiveOnlyStateNamesType } from "./SingleDataPointSensor.js";

class OnOffButton extends LoxoneDevice<ActiveOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, host: DeviceHost) {
    super(
      control,
      host,
      [onOffLightSwitch, bridgedNode, powerSource],
      ACTIVE_ONLY_STATE_NAMES,
      "button",
      `${OnOffButton.name}_${control.structureSection.uuidAction.replace(/-/g, "_")}`,
    );

    const latestValueEvent = this.getLatestValueEvent("active");
    const initialValue = latestValueEvent ? latestValueEvent.value === 1 : false;

    this.Endpoint = this.createDefaultEndpoint()
      .createDefaultGroupsClusterServer()
      .createDefaultOnOffClusterServer(initialValue);

    this.addLoxoneCommandHandler("on", () => {
      // the timer callback must be synchronous, so the attribute update is sent fire-and-forget
      setTimeout(() => {
        void this.Endpoint.updateAttribute(OnOff.id, "onOff", false, this.Endpoint.log).catch(
          (error: unknown) => {
            this.Endpoint.log.error(`Error resetting the onOff attribute: ${String(error)}`);
          },
        );
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
    const latestValueEvent = this.getLatestValueEvent("active");
    await this.updateAttributesFromLoxoneEvent(latestValueEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent): Promise<void> {
    await this.Endpoint.updateAttribute(OnOff.id, "onOff", event.value === 1, this.Endpoint.log);
  }

  static override typeNames(): string[] {
    return ["button"];
  }
}

export { OnOffButton };
