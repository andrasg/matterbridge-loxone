import { bridgedNode, powerSource, onOffLight } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { OnOff } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { getLatestTextEvent } from '../utils/Utils.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

class LightMood extends LoxoneDevice {
  moodId: number;
  override states: Record<'activeMoods', string>;

  constructor(control: Control, platform: LoxonePlatform, moodId: number, moodName: string) {
    super(
      control,
      platform,
      [onOffLight, bridgedNode, powerSource],
      [control.structureSection.states.activeMoods, control.structureSection.states.moodList],
      'light mood',
      `${LightMood.name}_${control.structureSection.uuidAction.replace(/-/g, '_')}_${moodId}`,
      moodName,
    );
    this.states = control.structureSection.states;

    this.moodId = moodId;
    const latestActiveMoodsEvent = this.getLatestTextEvent(this.states.activeMoods);
    const initialValue = latestActiveMoodsEvent ? this.calculateState(latestActiveMoodsEvent) : false;

    this.Endpoint.createDefaultGroupsClusterServer().createDefaultOnOffClusterServer(initialValue);

    this.addLoxoneCommandHandler('on', () => {
      return `addMood/${this.moodId}`;
    });
    this.addLoxoneCommandHandler('off', () => {
      return `removeMood/${this.moodId}`;
    });
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent) {
    if (!(event instanceof LoxoneTextEvent)) return;

    this.updateAttributesFromLoxoneEvent(event);
  }

  calculateState(event: LoxoneTextEvent): boolean {
    return JSON.parse(event.text).includes(this.moodId);
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
    const latestActiveMoodsEvent = this.getLatestTextEvent(this.states.activeMoods);

    if (!latestActiveMoodsEvent) {
      this.Endpoint.log.warn(`No initial text event found for ${this.longname}`);
      return;
    }

    await this.updateAttributesFromLoxoneEvent(latestActiveMoodsEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneTextEvent) {
    const currentState = this.calculateState(event);
    await this.Endpoint.updateAttribute(OnOff.Cluster.id, 'onOff', currentState, this.Endpoint.log);
  }
}

export { LightMood };
