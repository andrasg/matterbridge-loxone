import { 
    bridgedNode, 
    powerSource,
    onOffSwitch,
} from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { OnOff } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';

class SwitchDevice extends LoxoneDevice {

    ControlUUID: string;

    constructor(structureSection: any, platform: LoxonePlatform, initialUpdateEvents: LoxoneUpdateEvent[]) {
        super(structureSection, platform, [onOffSwitch, bridgedNode, powerSource], 
            [
                structureSection.states.active
            ], "switch", `${SwitchDevice.name}-${structureSection.uuidAction}`);

        this.ControlUUID = this.structureSection.uuidAction;
        let initialEvent = initialUpdateEvents.find((event) => event.uuid === this.StatusUUIDs[0]);
        let initialValue = initialEvent ? initialEvent.value : 0;

        this.Endpoint
            .createDefaultOnOffClusterServer(initialValue === 1)
            .createDefaultPowerSourceWiredClusterServer();

        this.Endpoint.addCommandHandler('on', async () => {
            platform.loxoneAPI!.sendCommand(this.ControlUUID, "on");
            this.Endpoint.log.info("Loxone API command 'on' called");
        });
        this.Endpoint.addCommandHandler('off', async () => {
            platform.loxoneAPI!.sendCommand(this.ControlUUID, "off");
            this.Endpoint.log.info("Loxone API command 'off' called");
        });
    }

    override async handleDeviceEvent(event: LoxoneUpdateEvent) {
        if (event.value === 1) {
            if (await this.Endpoint.getAttribute(OnOff.Cluster.id, 'onOff') === false)
                await this.Endpoint.setAttribute(OnOff.Cluster.id, 'onOff', true, this.Endpoint.log);
        } else {
            if (await this.Endpoint.getAttribute(OnOff.Cluster.id, 'onOff') === true)
                await this.Endpoint.setAttribute(OnOff.Cluster.id, 'onOff', false, this.Endpoint.log);
        }        
    }
}

export { SwitchDevice }