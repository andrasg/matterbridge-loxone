import { 
    bridgedNode, 
    powerSource,
    humiditySensor
} from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { RelativeHumidityMeasurement } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';

class HumiditySensor extends LoxoneDevice {

    constructor(structureSection: any, platform: LoxonePlatform, initialUpdateEvents: LoxoneUpdateEvent[]) {
        super(structureSection, platform, [humiditySensor, bridgedNode, powerSource], 
            [
                structureSection.states.active
            ], "humidity sensor", `${HumiditySensor.name}-${structureSection.uuidAction}`);

        let initialEvent = initialUpdateEvents.find((event) => event.uuid === this.StatusUUIDs[0]);
        let initialValue = initialEvent ? initialEvent.value : 0;

        this.Endpoint
            .createDefaultRelativeHumidityMeasurementClusterServer(initialValue * 100)
            .createDefaultPowerSourceWiredClusterServer();
    }

    override async handleDeviceEvent(event: LoxoneUpdateEvent) {

        await this.Endpoint.setAttribute(RelativeHumidityMeasurement.Cluster.id, 'measuredValue', event.value * 100, this.Endpoint.log);
    }
}

export { HumiditySensor }