import { bridgedNode, powerSource, onOffLight, MatterbridgeEndpoint } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { OnOff } from 'matterbridge/matter/clusters';
import { AdditionalConfig, LoxoneDevice, RegisterLoxoneDevice } from './LoxoneDevice.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

const StateNames = {
  activeMoods: 'activeMoods',
  moodList: 'moodList',
} as const;
type StateNameType = (typeof StateNames)[keyof typeof StateNames];
const StateNameKeys = Object.values(StateNames) as StateNameType[];

class LightMood extends LoxoneDevice<StateNameType> {
  public Endpoint: MatterbridgeEndpoint;
  moodId = -1;
  moodName = '';

  constructor(control: Control, platform: LoxonePlatform, additionalConfig: AdditionalConfig) {
    super(
      control,
      platform,
      [onOffLight, bridgedNode, powerSource],
      StateNameKeys,
      'light mood',
      `${LightMood.name}_${control.structureSection.uuidAction.replace(/-/g, '_')}_${additionalConfig.moodId}`,
    );

    if (!additionalConfig || isNaN(parseInt(additionalConfig.moodId))) {
      throw new Error(`LightMood device requires a valid moodId as additionalConfig.`);
    }

    this.moodId = parseInt(additionalConfig.moodId);
    // overrides for special mood ID's
    if (this.moodId === 0) {
      this.moodId = 778;
    } else if (this.moodId === 99) {
      this.moodId = 777;
    }
    this.moodName = this.getMoodName();

    this.setNameSuffix(this.moodName);

    const latestActiveMoodsEvent = this.getLatestTextEvent(StateNames.activeMoods);
    const initialValue = latestActiveMoodsEvent ? this.calculateState(latestActiveMoodsEvent) : false;

    this.Endpoint = this.createDefaultEndpoint().createDefaultGroupsClusterServer().createDefaultOnOffClusterServer(initialValue);

    this.addLoxoneCommandHandler('on', () => {
      return `addMood/${this.moodId}`;
    });
    this.addLoxoneCommandHandler('off', () => {
      return `removeMood/${this.moodId}`;
    });
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent) {
    if (!(event instanceof LoxoneTextEvent)) return;

    if (event.state?.name === StateNames.moodList) return;

    this.updateAttributesFromLoxoneEvent(event);
  }

  private calculateState(event: LoxoneTextEvent): boolean {
    return JSON.parse(event.text).includes(this.moodId);
  }

  private getMoodName(): string {
    const moodListState = this.control.statesByName.get(StateNames.moodList);
    if (!moodListState || !moodListState.latestEvent || !(moodListState.latestEvent instanceof LoxoneTextEvent)) {
      throw new Error(`Could not get moodlist for ${this.control.name}`);
    }

    return this.getMoodFromMoodList(moodListState.latestEvent.text, this.moodId).name;
  }

  private getMoodFromMoodList(moodlist: string, moodId: number) {
    const moodList: [{ 'name': string; 'id': number }] = JSON.parse(moodlist);
    const mood = moodList.find((mood: { id: number }) => mood.id === moodId);
    if (mood === undefined) {
      throw new Error(`Mood with ID ${moodId} not found in mood list.`);
    }
    return mood;
  }

  override async populateInitialState() {
    const latestActiveMoodsEvent = this.getLatestTextEvent(StateNames.activeMoods);
    await this.updateAttributesFromLoxoneEvent(latestActiveMoodsEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneTextEvent) {
    const currentState = this.calculateState(event);
    await this.Endpoint.updateAttribute(OnOff.Cluster.id, 'onOff', currentState, this.Endpoint.log);
  }

  static override typeNames(): string[] {
    return ['mood'];
  }
}

RegisterLoxoneDevice(LightMood);

export { LightMood };
