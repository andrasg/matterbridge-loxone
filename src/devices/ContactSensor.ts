import { 
    bridgedNode, 
    powerSource,
    contactSensor
} from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { BooleanState } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';

class ContactSensor extends LoxoneDevice {

    constructor(structureSection: any, platform: LoxonePlatform, initialUpdateEvents: LoxoneUpdateEvent[]) {
        super(structureSection, platform, [contactSensor, bridgedNode, powerSource], 
            [
                structureSection.states.active
            ], "contact sensor", `${ContactSensor.name}-${structureSection.uuidAction}`);

        let initialEvent = initialUpdateEvents.find((event) => event.uuid === this.StatusUUIDs[0]);
        let initialValue = initialEvent ? initialEvent.value === 1 : false;

        this.Endpoint
            .createDefaultBooleanStateClusterServer(initialValue)
            .createDefaultPowerSourceWiredClusterServer();
    }

    override async handleDeviceEvent(event: LoxoneUpdateEvent) {

        await this.Endpoint.setAttribute(BooleanState.Cluster.id, 'stateValue', event.value === 1, this.Endpoint.log);
    }
}

export { ContactSensor }