import { bridgedNode, powerSource, onOffSwitch } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneValueUpdateEvent } from '../models/LoxoneValueUpdateEvent.js';
import { OnOff } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneUpdateEvent } from '../models/LoxoneUpdateEvent.js';

class SwitchDevice extends LoxoneDevice {

    constructor(structureSection: any, platform: LoxonePlatform) {
        super(structureSection, platform, [onOffSwitch, bridgedNode, powerSource],
            [
                structureSection.states.active
            ], "switch", `${SwitchDevice.name}-${structureSection.uuidAction}`);

        let initialValue = this.latestInitialValueEvent ? this.latestInitialValueEvent.value : 0;

        this.Endpoint
            .createDefaultOnOffClusterServer(initialValue === 1);

        this.addLoxoneCommandHandler('on');
        this.addLoxoneCommandHandler('off');
    }

    override async handleDeviceEvent(event: LoxoneUpdateEvent) {
        if (!(event instanceof LoxoneValueUpdateEvent)) return;

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