import { contactSensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { BooleanState } from 'matterbridge/matter/clusters';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { SingleDataPointSensor } from './SingleDataPointSensor.js';

class ContactSensor extends SingleDataPointSensor {
  constructor(structureSection: { states: { active: string } }, platform: LoxonePlatform) {
    super(structureSection, platform, ContactSensor.name, 'contact sensor', structureSection.states.active, contactSensor, BooleanState.Cluster.id, 'stateValue');

    const latestValueEvent = this.getLatestValueEvent(structureSection.states.active);
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint.createDefaultBooleanStateClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueUpdateEvent | undefined): boolean {
    return event ? event.value === 1 : false;
  }
}

export { ContactSensor };
