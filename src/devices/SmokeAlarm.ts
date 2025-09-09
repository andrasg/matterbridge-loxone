import { bridgedNode, powerSource, smokeCoAlarm } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { SmokeCoAlarm } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

class SmokeAlarm extends LoxoneDevice {
  private cause = 0;
  private level = 0;
  override states: Record<'level' | 'alarmCause', string>;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      [smokeCoAlarm, bridgedNode, powerSource],
      [control.structureSection.states.alarmCause, control.structureSection.states.level],
      'smoke alarm',
      `${SmokeAlarm.name}_${control.structureSection.uuidAction.replace(/-/g, '_')}`,
    );
    this.states = control.structureSection.states;

    const latestCause = this.getLatestValueEvent(this.states.level);
    const latestLevel = this.getLatestValueEvent(this.states.alarmCause);

    this.cause = latestCause ? latestCause.value : 0;
    this.level = latestLevel ? latestLevel.value : 0;

    const alarmState = this.calculateAlarmState();

    this.Endpoint.createSmokeOnlySmokeCOAlarmClusterServer(alarmState);
  }

  private calculateAlarmState(): SmokeCoAlarm.AlarmState {
    const isAlarm = (this.cause & 0x01) === 1 && this.level === 1;
    const alarmState = isAlarm ? SmokeCoAlarm.AlarmState.Critical : SmokeCoAlarm.AlarmState.Normal;
    return alarmState;
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent) {
    if (!(event instanceof LoxoneValueEvent)) return;

    if (event.uuid.stringValue === this.control.structureSection.states.alarmCause) {
      this.cause = event.value;
    } else if (event.uuid.stringValue === this.control.structureSection.states.level) {
      this.level = event.value;
    }

    await this.updateAttributesFromInternalState();
  }

  override async populateInitialState() {
    const latestCause = this.getLatestValueEvent(this.control.structureSection.states.level);
    const latestLevel = this.getLatestValueEvent(this.control.structureSection.states.alarmCause);

    if (!latestCause || !latestLevel) {
      this.Endpoint.log.warn(`No initial value event found for ${this.longname}`);
      return;
    }

    this.cause = latestCause.value;
    this.level = latestLevel.value;

    await this.updateAttributesFromInternalState();
  }

  private async updateAttributesFromInternalState() {
    const alarmState = this.calculateAlarmState();
    await this.Endpoint.updateAttribute(SmokeCoAlarm.Cluster.id, 'smokeState', alarmState, this.Endpoint.log);
  }
}

export { SmokeAlarm };
