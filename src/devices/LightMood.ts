import { bridgedNode, powerSource, onOffLight } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { OnOff } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneTextUpdateEvent } from '../data/LoxoneTextUpdateEvent.js';
import { Utils } from '../utils/Utils.js';

class LightMood extends LoxoneDevice {
  moodId: number;

  constructor(structureSection: any, platform: LoxonePlatform, moodId: number, moodName: string) {
    super(
      structureSection,
      platform,
      [onOffLight, bridgedNode, powerSource],
      [structureSection.states.activeMoods],
      'light mood',
      `${LightMood.name}_${structureSection.uuidAction.replace(/-/g, '_')}_${moodId}`,
      moodName
    );

    this.moodId = moodId;
    let latestActiveMoodsEvent = this.getLatestTextEvent(structureSection.states.activeMoods);
    let initialValue = latestActiveMoodsEvent ? this.calculateState(latestActiveMoodsEvent) : false;

    this.Endpoint.createDefaultOnOffClusterServer(initialValue);

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
    let moodList = Utils.getLatestTextEvent(updateEvents, moodListUUID);
    if (moodList === undefined) {
      throw new Error(`Could not find any moodList events in the updateEvents.`);
    }

    let mood = LightMood.getMoodFromMoodList(moodList.text, moodId);
    return mood.name;
  }

  private static getMoodFromMoodList(moodlist: string, moodId: number) {
    let moodList: [{ 'name': string; 'id': number }] = JSON.parse(moodlist);
    let mood = moodList.find((mood: any) => mood.id === moodId);
    if (mood === undefined) {
      throw new Error(`Mood with ID ${moodId} not found in mood list.`);
    }
    return mood;
  }

  override async setState() {
    let latestActiveMoodsEvent = this.getLatestTextEvent(this.structureSection.states.activeMoods);

    if (!latestActiveMoodsEvent) {
      this.Endpoint.log.warn(`No initial text event found for ${this.longname}`);
      return;
    }

    await this.updateAttributesFromLoxoneEvent(latestActiveMoodsEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneTextUpdateEvent) {
    let currentState = this.calculateState(event);
    await this.Endpoint.setAttribute(OnOff.Cluster.id, 'onOff', currentState, this.Endpoint.log);
  }
}

export { LightMood };
