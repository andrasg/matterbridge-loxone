import { contactSensor, MatterbridgeEndpoint } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { BooleanState } from 'matterbridge/matter/clusters';
import { ActiveOnlyStateNames, ActiveOnlyStateNamesType, ActiveOnlyStateNameKeys, SingleDataPointSensor } from './SingleDataPointSensor.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';
import { RegisterLoxoneDevice } from './LoxoneDevice.js';

class ContactSensor extends SingleDataPointSensor<ActiveOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, platform: LoxonePlatform) {
    super(control, platform, ContactSensor.name, 'contact sensor', ActiveOnlyStateNameKeys[0], contactSensor, BooleanState.Cluster.id, 'stateValue');

    const latestValueEvent = this.getLatestValueEvent(ActiveOnlyStateNames.active);
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint = this.createDefaultEndpoint().createDefaultBooleanStateClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueEvent | undefined): boolean {
    return event ? event.value === 1 : false;
  }

  static override typeNames(): string[] {
    return ['contactsensor', 'contact'];
  }
}

// register device with the registry
RegisterLoxoneDevice(ContactSensor);

export { ContactSensor };
