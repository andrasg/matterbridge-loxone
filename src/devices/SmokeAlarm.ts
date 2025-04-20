import { bridgedNode, powerSource, smokeCoAlarm } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { SmokeCoAlarm } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';

class SmokeAlarm extends LoxoneDevice {

  private cause: number = 0;
  private level: number = 0;

  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      [ smokeCoAlarm, bridgedNode, powerSource ],
      [ structureSection.states.alarmCause, structureSection.states.level ],
      'smoke alarm',
      `${SmokeAlarm.name}-${structureSection.uuidAction}`,
    );

    let latestCause = this.getLatestInitialValueEvent(structureSection.states.level);
    let latestLevel = this.getLatestInitialValueEvent(structureSection.states.alarmCause);

    this.cause = latestCause ? latestCause.value : 0;
    this.level = latestLevel ? latestLevel.value : 0;

    let alarmState = this.calculateAlarmState();

    this.Endpoint.createSmokeOnlySmokeCOAlarmClusterServer(alarmState);
  }

  private calculateAlarmState(): SmokeCoAlarm.AlarmState {
    let isAlarm = ((this.cause & 0x01) === 1) && this.level === 1;
    let alarmState = isAlarm ? SmokeCoAlarm.AlarmState.Critical : SmokeCoAlarm.AlarmState.Normal;
    return alarmState;
  }

  override async handleLoxoneDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    if (event.uuid === this.structureSection.states.alarmCause) {
      this.cause = event.value;
    } else if (event.uuid === this.structureSection.states.alarmCause) {
      this.level = event.value;
    }

    let alarmState = this.calculateAlarmState();

    this.Endpoint.setAttribute(SmokeCoAlarm.Cluster.id, 'smokeState', alarmState, this.Endpoint.log);

  }

  override async setState() {
    let latestCause = this.getLatestInitialValueEvent(this.structureSection.states.level);
    let latestLevel = this.getLatestInitialValueEvent(this.structureSection.states.alarmCause);

    if (!latestCause || !latestLevel) {
      this.Endpoint.log.warn(`No initial value event found for ${this.longname}`);
      return;
    }

    this.cause = latestCause.value;
    this.level = latestLevel.value;

    let alarmState = this.calculateAlarmState();

    if (await this.Endpoint.getAttribute(SmokeCoAlarm.Cluster.id, 'smokeState', this.Endpoint.log) !== alarmState) {
      await this.Endpoint.setAttribute(SmokeCoAlarm.Cluster.id, 'smokeState', alarmState, this.Endpoint.log);
    }
  }
}

export { SmokeAlarm };
