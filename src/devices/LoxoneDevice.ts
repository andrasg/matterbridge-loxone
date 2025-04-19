import { AtLeastOne, DeviceTypeDefinition, MatterbridgeEndpoint } from "matterbridge";
import { LoxonePlatform } from "../platform.js";
import { LoxoneUpdateEvent } from "../data/LoxoneUpdateEvent.js";

/**
 * Base class for Loxone devices. This class should be extended by all Loxone device classes.
 */
abstract class LoxoneDevice {
    /**
     * The UUIDs of events this device will respond to.
     * @type {string[]}
     */
    public StatusUUIDs: string[];
    public Endpoint: MatterbridgeEndpoint;
    public structureSection: any;
    public roomname: string;
    public name: string;
    public longname: string;

    constructor(
        structureSection: {}, 
        platform: LoxonePlatform, 
        deviceTypeDefinitions: AtLeastOne<DeviceTypeDefinition>,
        statusUUIDs: string[],
        typeName: string,
        uniqueStorageKey: string,
    ) {
        this.structureSection = structureSection;
        this.StatusUUIDs = statusUUIDs;
        this.roomname = platform.roomMapping.get(this.structureSection.room) ?? "Unknown";
        this.name = this.structureSection.name;
        this.longname = `${this.roomname} ${this.name}`;

        this.Endpoint = new MatterbridgeEndpoint(deviceTypeDefinitions, { uniqueStorageKey: uniqueStorageKey }, platform.config.debug as boolean)
            .createDefaultIdentifyClusterServer()
            .createDefaultGroupsClusterServer()
            .createDefaultBridgedDeviceBasicInformationClusterServer(
                this.name,
                this.StatusUUIDs[0],
                0xfff1,
                'Matterbridge',
                `Matterbridge ${typeName}`,
                parseInt(platform.version.replace(/\D/g, '')),
                platform.version === '' ? 'Unknown' : platform.version,
                parseInt(platform.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
                platform.matterbridge.matterbridgeVersion,
            );

        this.Endpoint.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
            platform.log.info(`Command identify called identifyTime: ${identifyTime}`);
        });

        platform.setSelectDevice(this.Endpoint.serialNumber ?? '', this.Endpoint.deviceName ?? '', undefined, 'hub');
        
        if (platform.validateDevice(this.Endpoint.deviceName ?? '')) {
            platform.registerDevice(this.Endpoint);
        }
    }

    /**
     * Handles the Loxone update event raised by the platform. Do not use. Use {@link LoxoneDevice.handleDeviceEvent} instead.
     * @param event The LoxoneUpdateEvent to handle.
     */
    async handleUpdateEvent(event: LoxoneUpdateEvent) {
        if (!this.StatusUUIDs.includes(event.uuid)) {
            this.Endpoint?.log.error(`Loxone event: ${event.uuid} received by ${this.StatusUUIDs.join(', ')}`);
            return;
        }

        await this.handleDeviceEvent(event);
    }

    /**
     * Handle the device event. Method must be overridden in subclasses.
     * @param event The LoxoneUpdateEvent to handle.
     */
    abstract handleDeviceEvent(event: LoxoneUpdateEvent): Promise<void>;
}

export { LoxoneDevice };