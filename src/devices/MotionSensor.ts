import { 
    bridgedNode, 
    powerSource,
    occupancySensor
} from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { OccupancySensing } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';

class MotionSensor extends LoxoneDevice {

    constructor(structureSection: any, platform: LoxonePlatform, initialUpdateEvents: LoxoneUpdateEvent[]) {
        super(structureSection, platform, [occupancySensor, bridgedNode, powerSource], 
            [
                structureSection.states.active
            ], "motion sensor", `${MotionSensor.name}-${structureSection.uuidAction}`);

        let initialEvent = initialUpdateEvents.find((event) => event.uuid === this.StatusUUIDs[0]);
        let initialValue = initialEvent ? initialEvent.value === 1 : false;

        this.Endpoint
            .createDefaultOccupancySensingClusterServer(initialValue)
            .createDefaultPowerSourceWiredClusterServer();
    }

    override async handleDeviceEvent(event: LoxoneUpdateEvent) {

        await this.Endpoint.setAttribute(OccupancySensing.Cluster.id, 'occupancy', { occupied: event.value === 1 }, this.Endpoint.log);
    }
}

export { MotionSensor }