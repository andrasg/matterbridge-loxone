import { 
    bridgedNode, 
    powerSource,
    temperatureSensor,
} from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { TemperatureMeasurement } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';

class TemperatureSensor extends LoxoneDevice {

    constructor(structureSection: any, platform: LoxonePlatform, initialUpdateEvents: LoxoneUpdateEvent[]) {
        super(structureSection, platform, [temperatureSensor, bridgedNode, powerSource], 
            [
                structureSection.states.active
            ], "temperature sensor", `${TemperatureSensor.name}-${structureSection.uuidAction}`);

        let initialEvent = initialUpdateEvents.find((event) => event.uuid === this.StatusUUIDs[0]);
        let initialValue = initialEvent ? initialEvent.value : 0;

        this.Endpoint
            .createDefaultTemperatureMeasurementClusterServer(initialValue * 100)
            .createDefaultPowerSourceWiredClusterServer();

    }

    override async handleDeviceEvent(event: LoxoneUpdateEvent) {

        await this.Endpoint.setAttribute(TemperatureMeasurement.Cluster.id, 'measuredValue', event.value * 100, this.Endpoint.log);
    }
}

export { TemperatureSensor }