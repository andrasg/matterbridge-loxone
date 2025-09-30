import { bridgedNode, MatterbridgeEndpoint, powerSource, smokeCoAlarm } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { SmokeCoAlarm } from 'matterbridge/matter/clusters';
import { LoxoneDevice, RegisterLoxoneDevice } from './LoxoneDevice.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';
import { ValueOnlyStateNameKeys, ValueOnlyStateNames, ValueOnlyStateNamesType } from './SingleDataPointSensor.js';
import { alarmStateValueConverter } from '../utils/Converters.js';

class CoAlarm extends LoxoneDevice<ValueOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      [smokeCoAlarm, bridgedNode, powerSource],
      ValueOnlyStateNameKeys,
      'co alarm',
      `${CoAlarm.name}_${control.structureSection.uuidAction.replace(/-/g, '_')}`,
    );

    const latestValue = this.getLatestValueEvent(ValueOnlyStateNames.value);
    const alarmState: SmokeCoAlarm.AlarmState = alarmStateValueConverter(latestValue);

    this.Endpoint = this.createDefaultEndpoint().createCoOnlySmokeCOAlarmClusterServer(alarmState);
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent) {
    if (!(event instanceof LoxoneValueEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState() {
    const latestValue = this.getLatestValueEvent(ValueOnlyStateNames.value);
    await this.updateAttributesFromLoxoneEvent(latestValue);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent) {
    const alarmState: SmokeCoAlarm.AlarmState = alarmStateValueConverter(event);
    await this.Endpoint.updateAttribute(SmokeCoAlarm.Cluster.id, 'coState', alarmState, this.Endpoint.log);
  }

  static override typeNames(): string[] {
    return ['co', 'cosensor'];
  }
}

RegisterLoxoneDevice(CoAlarm);

export { CoAlarm };
