import {
  bridgedNode,
  powerSource,
  onOffLightSwitch,
  type MatterbridgeEndpoint,
} from "matterbridge";
import type { LoxonePlatform } from "../LoxonePlatform.js";
import { OnOff } from "matterbridge/matter/clusters";
import { type AdditionalConfig, LoxoneDevice, RegisterLoxoneDevice } from "./LoxoneDevice.js";
import LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type LoxoneTextEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";

const StateNames = {
  activeOutput: "activeOutput",
} as const;
type StateNameType = (typeof StateNames)[keyof typeof StateNames];
const StateNameKeys = Object.values(StateNames);

class RadioButton extends LoxoneDevice<StateNameType> {
  public Endpoint: MatterbridgeEndpoint;
  outputId: number;
  outputName: string;

  constructor(control: Control, platform: LoxonePlatform, additionalConfig: AdditionalConfig) {
    super(
      control,
      platform,
      [onOffLightSwitch, bridgedNode, powerSource],
      StateNameKeys,
      "radio button",
      `${RadioButton.name}_${control.structureSection.uuidAction.replace(/-/g, "_")}_${additionalConfig.outputId}`,
    );

    if (
      !additionalConfig?.outputId ||
      (Number.isNaN(Number.parseInt(additionalConfig.outputId)) &&
        additionalConfig.outputId !== "allOff")
    ) {
      throw new Error(`LightMood device requires a valid outputId as additionalConfig.`);
    }

    this.outputId =
      additionalConfig.outputId === "allOff" ? 0 : Number.parseInt(additionalConfig.outputId);
    this.outputName = this.getOutputName();

    this.setNameSuffix(this.outputName);

    const latestActiveOutputEvent = this.getLatestValueEvent(StateNames.activeOutput);
    const initialValue = latestActiveOutputEvent.value === this.outputId;

    this.Endpoint = this.createDefaultEndpoint()
      .createDefaultGroupsClusterServer()
      .createDefaultOnOffClusterServer(initialValue);

    this.addLoxoneCommandHandler("on", () => {
      return this.outputId === 0 ? "reset" : `${this.outputId}`;
    });
    this.addLoxoneCommandHandler("off", () => {
      return `reset`;
    });
  }

  private getOutputName(): string {
    if (this.outputId === 0) {
      return this.control.structureSection.details.allOff;
    } else {
      const output = this.control.structureSection.details.outputs[this.outputId];
      if (!output) {
        throw new Error(`Could not find output ${this.outputId} for control ${this.control.name}`);
      }
      return output;
    }
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void> {
    if (!(event instanceof LoxoneValueEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState(): Promise<void> {
    const latestActiveOutputEvent = this.getLatestValueEvent(StateNames.activeOutput);
    await this.updateAttributesFromLoxoneEvent(latestActiveOutputEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent): Promise<void> {
    await this.Endpoint.updateAttribute(
      OnOff.id,
      "onOff",
      event.value === this.outputId,
      this.Endpoint.log,
    );
  }

  static override typeNames(): string[] {
    return ["radio", "radiobutton"];
  }
}

RegisterLoxoneDevice(RadioButton);

export { RadioButton };
