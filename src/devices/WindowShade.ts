import {
    bridgedNode,
    powerSource,
    coverDevice
} from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { WindowCovering } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';

class WindowShade extends LoxoneDevice {

    private operationalStatus: WindowCovering.MovementStatus = WindowCovering.MovementStatus.Stopped;
    private currentPosition: number = 0;
    private targetPosition: number = 0;
    private updatePending = false;

    constructor(structureSection: any, platform: LoxonePlatform, initialUpdateEvents: LoxoneUpdateEvent[]) {
        super(
            structureSection, platform, [coverDevice, bridgedNode, powerSource],
            [
                structureSection.states.position,
                structureSection.states.targetPosition,
                structureSection.states.up,
                structureSection.states.down
            ], "window covering", `WindowShade-${structureSection.uuidAction}`
        );

        let initialEvent = initialUpdateEvents.find((event) => event.uuid === this.structureSection.states.position);
        this.currentPosition = initialEvent ? initialEvent.value * 10000 : 0;

        this.Endpoint
            .createDefaultWindowCoveringClusterServer(this.currentPosition) 
            .createDefaultPowerSourceWiredClusterServer();

        this.Endpoint.addCommandHandler('stopMotion', async () => {
            this.Endpoint.log.info("Loxone API command 'stop' called");
            platform.loxoneAPI!.sendCommand(this.structureSection.uuidAction, "stop");
        });

        this.Endpoint.addCommandHandler('downOrClose', async () => {
            this.Endpoint.log.info("Loxone API command 'FullDown' called");
            platform.loxoneAPI!.sendCommand(this.structureSection.uuidAction, "FullDown");
        });

        this.Endpoint.addCommandHandler('upOrOpen', async () => {
            this.Endpoint.log.info("Loxone API command 'FullUp' called");
            platform.loxoneAPI!.sendCommand(this.structureSection.uuidAction, "FullUp");
        });

        this.Endpoint.addCommandHandler('goToLiftPercentage', async ({ request: { liftPercent100thsValue } }) => {
            let targetNumber = Math.round(liftPercent100thsValue / 100);
            let targetString;
            if (targetNumber < 1) {
                targetString = "FullUp";
            } else if (targetNumber > 99) {
                targetString = "FullDown";
            } else {
                targetString = `manualPosition/${targetNumber}`;
            }
            this.Endpoint.log.info(`Loxone API command '${targetString}' called`);            
            platform.loxoneAPI!.sendCommand(this.structureSection.uuidAction, targetString);
        });
    }

    override async handleDeviceEvent(event: LoxoneUpdateEvent) {
        if (event.uuid === this.structureSection.states.targetPosition) {
            this.targetPosition = event.value * 10000;
            this.Endpoint.log.info(`Target position: ${this.targetPosition}`);
        } else if (event.uuid === this.structureSection.states.position) {
            this.currentPosition = event.value * 10000;
            this.Endpoint.log.info(`Current position: ${this.currentPosition}`);
            let oldCurrent = await this.Endpoint.getAttribute(WindowCovering.Cluster.id, 'currentPositionLiftPercent100ths');
            if (oldCurrent !== this.currentPosition)
                await this.Endpoint.setAttribute(WindowCovering.Cluster.id, 'currentPositionLiftPercent100ths', this.currentPosition, this.Endpoint.log);
            }

        if (event.uuid === this.structureSection.states.up) {
            if (event.value === 1) {
                this.Endpoint.log.info(`Moving up`);
                this.operationalStatus = WindowCovering.MovementStatus.Opening;
                await this.handleMovementActionWithDelay();
            } else {
                this.Endpoint.log.info(`Stopping`);
                this.operationalStatus = WindowCovering.MovementStatus.Stopped;
                await this.handleMovementActionWithDelay();
            }
        } else if (event.uuid === this.structureSection.states.down) {
            if (event.value === 1) {
                this.Endpoint.log.info(`Moving up`);
                this.operationalStatus = WindowCovering.MovementStatus.Closing;
                await this.handleMovementActionWithDelay();
            } else {
                this.Endpoint.log.info(`Stopping`);
                this.operationalStatus = WindowCovering.MovementStatus.Stopped;
                await this.handleMovementActionWithDelay();
            }
        }
    }

    async handleMovementActionWithDelay() {
        if (this.updatePending)
            return;

        this.updatePending = true;

        let that = this;

        setTimeout(async () => {
            that.Endpoint.log.info(`Updating operational status: ${that.operationalStatus}, target: ${that.targetPosition}`);

            await that.Endpoint.setAttribute(WindowCovering.Cluster.id, 'targetPositionLiftPercent100ths', that.targetPosition, that.Endpoint.log);
            await that.Endpoint.setAttribute(WindowCovering.Cluster.id, 'operationalStatus',
                {
                    global: that.operationalStatus,
                    lift: that.operationalStatus,
                    tilt: that.operationalStatus,
                },
                that.Endpoint.log,
            );
            that.updatePending = false;
        }, 100);
    }
}

export { WindowShade }