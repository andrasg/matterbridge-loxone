import { bridgedNode, powerSource, onOffLight, type MatterbridgeEndpoint } from "matterbridge";
import type { DeviceHost } from "./DeviceHost.js";
import { OnOff } from "matterbridge/matter/clusters";
import { type AdditionalConfig, LoxoneDevice } from "./LoxoneDevice.js";
import LoxoneTextEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js";
import type LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";

const STATE_NAMES = ["activeMoods", "moodList"] as const;
type StateNameType = (typeof STATE_NAMES)[number];

class LightMood extends LoxoneDevice<StateNameType> {
  public Endpoint: MatterbridgeEndpoint;
  moodId = -1;
  moodName = "";

  constructor(control: Control, host: DeviceHost, additionalConfig: AdditionalConfig) {
    super(
      control,
      host,
      [onOffLight, bridgedNode, powerSource],
      STATE_NAMES,
      "light mood",
      `${LightMood.name}_${control.structureSection.uuidAction.replace(/-/g, "_")}_${additionalConfig.moodId}`,
    );

    if (!additionalConfig || Number.isNaN(Number.parseInt(additionalConfig.moodId))) {
      throw new Error(`LightMood device requires a valid moodId as additionalConfig.`);
    }

    this.moodId = Number.parseInt(additionalConfig.moodId);
    // overrides for special mood ID's
    if (this.moodId === 0) {
      this.moodId = 778;
    } else if (this.moodId === 99) {
      this.moodId = 777;
    }
    this.moodName = this.getMoodName();

    this.setNameSuffix(this.moodName);

    const latestActiveMoodsEvent = this.getLatestTextEvent("activeMoods");
    const initialValue = latestActiveMoodsEvent
      ? this.calculateState(latestActiveMoodsEvent)
      : false;

    this.Endpoint = this.createDefaultEndpoint()
      .createDefaultGroupsClusterServer()
      .createDefaultOnOffClusterServer(initialValue);

    this.addLoxoneCommandHandler("on", () => {
      return `addMood/${this.moodId}`;
    });
    this.addLoxoneCommandHandler("off", () => {
      return `removeMood/${this.moodId}`;
    });
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void> {
    if (!(event instanceof LoxoneTextEvent)) return;

    if (this.stateNameOf(event) === "moodList") return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  private calculateState(event: LoxoneTextEvent): boolean {
    return JSON.parse(event.text).includes(this.moodId);
  }

  private getMoodName(): string {
    const moodListState = this.control.statesByName.get("moodList");
    if (!moodListState?.latestEvent || !(moodListState.latestEvent instanceof LoxoneTextEvent)) {
      throw new Error(`Could not get moodlist for ${this.control.name}`);
    }

    return this.getMoodFromMoodList(moodListState.latestEvent.text, this.moodId).name;
  }

  private getMoodFromMoodList(moodlist: string, moodId: number): { name: string; id: number } {
    const moodList: [{ name: string; id: number }] = JSON.parse(moodlist);
    const mood = moodList.find((mood: { id: number }) => mood.id === moodId);
    if (mood === undefined) {
      throw new Error(`Mood with ID ${moodId} not found in mood list.`);
    }
    return mood;
  }

  override async populateInitialState(): Promise<void> {
    const latestActiveMoodsEvent = this.getLatestTextEvent("activeMoods");
    await this.updateAttributesFromLoxoneEvent(latestActiveMoodsEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneTextEvent): Promise<void> {
    const currentState = this.calculateState(event);
    await this.Endpoint.updateAttribute(OnOff.id, "onOff", currentState, this.Endpoint.log);
  }

  static override typeNames(): string[] {
    return ["mood"];
  }
}

export { LightMood };
