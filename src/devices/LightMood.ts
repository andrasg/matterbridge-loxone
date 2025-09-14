import { bridgedNode, powerSource, onOffLight, MatterbridgeEndpoint } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { OnOff } from 'matterbridge/matter/clusters';
import { LoxoneDevice, RegisterDevice } from './LoxoneDevice.js';
import { getLatestTextEvent } from '../utils/Utils.js';
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
  moodId: number;

  constructor(control: Control, platform: LoxonePlatform, moodId: number, moodName: string) {
    super(
      control,
      platform,
      /* deviceTypeDefinitions */ [onOffLight, bridgedNode, powerSource],
      /* stateNames */ StateNameKeys,
      /* typeName */ 'light mood',
      /* uniqueStorageKey */ `${LightMood.name}_${control.structureSection.uuidAction.replace(/-/g, '_')}_${moodId}`,
    );

    this.moodId = moodId;
    const latestActiveMoodsEvent = this.getLatestTextEvent(StateNames.activeMoods);
    const initialValue = latestActiveMoodsEvent ? this.calculateState(latestActiveMoodsEvent) : false;

    this.setNameSuffix(moodName);

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

  calculateState(event: LoxoneTextEvent): boolean {
    return JSON.parse(event.text).includes(this.moodId);
  }

  public static override nameExtractor(control: Control, platform: LoxonePlatform, additionalConfig: string): string {
    const moodId = parseInt(additionalConfig);

    return this.getMoodName(moodId, platform.initialUpdateEvents, control.structureSection.states.moodList);
  }

  public static getMoodName(moodId: number, updateEvents: (LoxoneValueEvent | LoxoneTextEvent)[], moodListUUID: string) {
    const moodList = getLatestTextEvent(updateEvents, moodListUUID);
    if (moodList === undefined) {
      throw new Error(`Could not find any moodList events in the updateEvents.`);
    }

    const mood = LightMood.getMoodFromMoodList(moodList.text, moodId);
    return mood.name;
  }

  private static getMoodFromMoodList(moodlist: string, moodId: number) {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
RegisterDevice(LightMood as unknown as any);

export { LightMood };
