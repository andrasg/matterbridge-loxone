import { bridgedNode, powerSource, onOffLight } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { OnOff } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneTextUpdateEvent } from '../data/LoxoneTextUpdateEvent.js';
import { getLatestTextEvent } from '../utils/Utils.js';

class LightMood extends LoxoneDevice {
  moodId: number;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(structureSection: any, platform: LoxonePlatform, moodId: number, moodName: string) {
    super(
      structureSection,
      platform,
      [onOffLight, bridgedNode, powerSource],
      [structureSection.states.activeMoods],
      'light mood',
      `${LightMood.name}_${structureSection.uuidAction.replace(/-/g, '_')}_${moodId}`,
      moodName,
    );

    this.moodId = moodId;
    const latestActiveMoodsEvent = this.getLatestTextEvent(structureSection.states.activeMoods);
    const initialValue = latestActiveMoodsEvent ? this.calculateState(latestActiveMoodsEvent) : false;

    this.Endpoint.createDefaultGroupsClusterServer().createDefaultOnOffClusterServer(initialValue);

    this.addLoxoneCommandHandler('on', () => {
      return `addMood/${this.moodId}`;
    });
    this.addLoxoneCommandHandler('off', () => {
      return `removeMood/${this.moodId}`;
    });
  }

  override async handleLoxoneDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneTextUpdateEvent)) return;

    this.updateAttributesFromLoxoneEvent(event);
  }

  calculateState(event: LoxoneTextUpdateEvent): boolean {
    return JSON.parse(event.text).includes(this.moodId);
  }

  public static getMoodName(moodId: number, updateEvents: LoxoneUpdateEvent[], moodListUUID: string) {
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
    const latestActiveMoodsEvent = this.getLatestTextEvent(this.structureSection.states.activeMoods);

    if (!latestActiveMoodsEvent) {
      this.Endpoint.log.warn(`No initial text event found for ${this.longname}`);
      return;
    }

    await this.updateAttributesFromLoxoneEvent(latestActiveMoodsEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneTextUpdateEvent) {
    const currentState = this.calculateState(event);
    await this.Endpoint.updateAttribute(OnOff.Cluster.id, 'onOff', currentState, this.Endpoint.log);
  }
}

export { LightMood };
