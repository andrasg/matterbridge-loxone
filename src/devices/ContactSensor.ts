import { bridgedNode, powerSource, contactSensor } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../models/LoxoneUpdateEvent.js';
import { BooleanState } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneValueUpdateEvent } from '../models/LoxoneValueUpdateEvent.js';

class ContactSensor extends LoxoneDevice {

    constructor(structureSection: any, platform: LoxonePlatform) {
        super(structureSection, platform, [contactSensor, bridgedNode, powerSource], 
            [
                structureSection.states.active
            ], "contact sensor", `${ContactSensor.name}-${structureSection.uuidAction}`);

        let initialValue = this.latestInitialValueEvent ? this.latestInitialValueEvent.value === 1 : false;

        this.Endpoint.createDefaultBooleanStateClusterServer(initialValue);
    }

    override async handleDeviceEvent(event: LoxoneUpdateEvent) {
        if (!(event instanceof LoxoneValueUpdateEvent)) return;

        await this.Endpoint.setAttribute(BooleanState.Cluster.id, 'stateValue', event.value === 1, this.Endpoint.log);
    }
}

export { ContactSensor }