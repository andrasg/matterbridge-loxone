import { contactSensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { BooleanState } from 'matterbridge/matter/clusters';
import { SingleDataPointSensor } from './SingleDataPointSensor.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

class ContactSensor extends SingleDataPointSensor {
  override states: Record<'active', string>;

  constructor(control: Control, platform: LoxonePlatform) {
    super(control, platform, ContactSensor.name, 'contact sensor', control.structureSection.states.active, contactSensor, BooleanState.Cluster.id, 'stateValue');

    this.states = control.structureSection.states;

    const latestValueEvent = this.getLatestValueEvent(control.structureSection.states.active);
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint.createDefaultBooleanStateClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueEvent | undefined): boolean {
    return event ? event.value === 1 : false;
  }
}

export { ContactSensor };
