import {
  bridgedNode,
  powerSource,
  dimmableLight,
  type MatterbridgeEndpoint,
  type CommandHandlerPayload,
} from "matterbridge";
import type { DeviceHost } from "./DeviceHost.js";
import { OnOff, LevelControl } from "matterbridge/matter/clusters";
import { LoxoneDevice } from "./LoxoneDevice.js";
import { LoxoneLevelInfo } from "../data/LoxoneLevelInfo.js";
import { MatterLevelInfo } from "../data/MatterLevelInfo.js";
import type LoxoneTextEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js";
import LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";

const STATE_NAMES = ["position"] as const;
type StateNameType = (typeof STATE_NAMES)[number];

class DimmerLight extends LoxoneDevice<StateNameType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, host: DeviceHost) {
    super(
      control,
      host,
      [dimmableLight, bridgedNode, powerSource],
      STATE_NAMES,
      "dimmable light",
      `${DimmerLight.name}_${control.structureSection.uuidAction.replace(/-/g, "_")}`,
    );
    const latestValueEvent = this.getLatestValueEvent("position");
    const value = LoxoneLevelInfo.fromLoxoneEvent(latestValueEvent);

    this.Endpoint = this.createDefaultEndpoint()
      .createDefaultGroupsClusterServer()
      .createDefaultOnOffClusterServer(value.onOff)
      .createDefaultLevelControlClusterServer(value.matterLevel);

    this.addLoxoneCommandHandler("on");
    this.addLoxoneCommandHandler("off");
    this.addLoxoneCommandHandler("moveToLevel", (data: CommandHandlerPayload<"moveToLevel">) => {
      const value = MatterLevelInfo.fromMatterNumber(data.request.level);
      return value.loxoneLevel.toString();
    });
    this.addLoxoneCommandHandler(
      "moveToLevelWithOnOff",
      (data: CommandHandlerPayload<"moveToLevelWithOnOff">) => {
        const value = MatterLevelInfo.fromMatterNumber(data.request.level);
        return value.loxoneLevel.toString();
      },
    );
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void> {
    if (!(event instanceof LoxoneValueEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState(): Promise<void> {
    const latestValueEvent = this.getLatestValueEvent("position");
    await this.updateAttributesFromLoxoneEvent(latestValueEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent): Promise<void> {
    const targetLevel = LoxoneLevelInfo.fromLoxoneEvent(event);
    await this.Endpoint.updateAttribute(OnOff.id, "onOff", targetLevel.onOff, this.Endpoint.log);

    if (event.value !== 1) {
      await this.Endpoint.updateAttribute(
        LevelControl.id,
        "currentLevel",
        targetLevel.matterLevel,
        this.Endpoint.log,
      );
    }
  }

  static override typeNames(): string[] {
    return ["dimmer"];
  }
}

export { DimmerLight };
