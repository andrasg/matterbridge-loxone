import { bridgedNode, powerSource, smokeCoAlarm } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { SmokeCoAlarm } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

const StateNames = {
  level: 'level',
  alarmCause: 'alarmCause',
} as const;
type StateNameType = (typeof StateNames)[keyof typeof StateNames];
const StateNameKeys = Object.values(StateNames) as StateNameType[];

class SmokeAlarm extends LoxoneDevice<StateNameType> {
  private cause = 0;
  private level = 0;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      [smokeCoAlarm, bridgedNode, powerSource],
      StateNameKeys,
      'smoke alarm',
      `${SmokeAlarm.name}_${control.structureSection.uuidAction.replace(/-/g, '_')}`,
    );

    const latestCause = this.getLatestValueEvent(StateNames.level);
    const latestLevel = this.getLatestValueEvent(StateNames.alarmCause);

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

    switch (event.state?.name) {
      case StateNames.level:
        this.level = event.value;
        break;
      case StateNames.alarmCause:
        this.cause = event.value;
        break;
    }

    await this.updateAttributesFromInternalState();
  }

  override async populateInitialState() {
    const latestCause = this.getLatestValueEvent(StateNames.alarmCause);
    const latestLevel = this.getLatestValueEvent(StateNames.level);

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
