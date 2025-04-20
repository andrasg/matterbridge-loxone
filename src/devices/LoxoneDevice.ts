import { AtLeastOne, DeviceTypeDefinition, MatterbridgeEndpoint, MatterbridgeEndpointCommands } from "matterbridge";
import { LoxonePlatform } from "../platform.js";
import { LoxoneUpdateEvent } from "../models/LoxoneUpdateEvent.js";
import { LoxoneValueUpdateEvent } from "../models/LoxoneValueUpdateEvent.js";
import { LoxoneTextUpdateEvent } from "../models/LoxoneTextUpdateEvent.js";
import { Utils } from "../utils/Utils.js";

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
    public initialEvents: LoxoneUpdateEvent[];
    public latestInitialValueEvent: LoxoneValueUpdateEvent | undefined;
    public latestInitialTextEvent: LoxoneTextUpdateEvent | undefined;
    public platform: LoxonePlatform;
    public typeName: string;
    public deviceTypeDefinitions: AtLeastOne<DeviceTypeDefinition>;
    public uniqueStorageKey: string;

    constructor(
        structureSection: {},
        platform: LoxonePlatform,
        deviceTypeDefinitions: AtLeastOne<DeviceTypeDefinition>,
        statusUUIDs: string[],
        typeName: string,
        uniqueStorageKey: string,
        nameOverride: string | undefined = undefined,
    ) {
        this.structureSection = structureSection;
        this.StatusUUIDs = statusUUIDs;
        this.roomname = platform.roomMapping.get(this.structureSection.room) ?? "Unknown";
        this.name = nameOverride ?? this.structureSection.name;
        this.longname = `${this.roomname} ${this.name}`;
        this.platform = platform;
        this.typeName = typeName;
        this.deviceTypeDefinitions = deviceTypeDefinitions;
        this.uniqueStorageKey = uniqueStorageKey;

        this.Endpoint = this.createDefaultEndpoint();

        this.initialEvents = platform.initialUpdateEvents.filter((event) => this.StatusUUIDs.includes(event.uuid)).sort((a, b) => { return b.date.getMilliseconds() - a.date.getMilliseconds(); });
        this.latestInitialValueEvent = Utils.getLatestValueEvent(this.initialEvents);
        this.latestInitialTextEvent = Utils.getLatestTextEvent(this.initialEvents);
    }

    public registerWithPlatform() {
        this.platform.setSelectDevice(this.Endpoint.serialNumber ?? '', this.Endpoint.deviceName ?? '', undefined, 'hub');

        if (this.platform.validateDevice(this.Endpoint.deviceName ?? '')) {
            this.platform.registerDevice(this.Endpoint);
        }
    }

    public createDefaultEndpoint(): MatterbridgeEndpoint {

        let endpoint = new MatterbridgeEndpoint(this.deviceTypeDefinitions, { uniqueStorageKey: this.uniqueStorageKey }, this.platform.config.debug as boolean)
            .createDefaultIdentifyClusterServer()
            .createDefaultGroupsClusterServer()
            .createDefaultBridgedDeviceBasicInformationClusterServer(
                this.name,
                this.uniqueStorageKey,
                0xfff1,
                'Matterbridge',
                `Matterbridge ${this.typeName}`,
                parseInt(this.platform.version.replace(/\D/g, '')),
                this.platform.version === '' ? 'Unknown' : this.platform.version,
                parseInt(this.platform.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
                this.platform.matterbridge.matterbridgeVersion,
            );

        endpoint.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
            this.platform.log.info(`Command identify called identifyTime: ${identifyTime}`);
        });
        return endpoint
    }

    public WithWiredPower(
    ): LoxoneDevice {
        this.Endpoint.createDefaultPowerSourceWiredClusterServer();
        return this;
    }

    private executeLoxoneCommand = (command: string) => {
        this.platform.loxoneConnection.sendCommand(this.structureSection.uuidAction, command);
        this.Endpoint.log.info(`Loxone API command '${command}' called`);
    }

    /**
     * Registers a command handler for the event. The command will be sent to the Loxone API.
     * @param event One of {@link MatterbridgeEndpointCommands}.
     * @param loxoneCommandFormatter Optional function to generate the Loxone command. If not provided, the parameter {@link command} will be used as the Loxone command.
     */
    public addLoxoneCommandHandler(event: keyof MatterbridgeEndpointCommands, loxoneCommandFormatter?: (...args: any[]) => string) {
        if (loxoneCommandFormatter === undefined) {
            loxoneCommandFormatter = () => { return event; };
        }

        const delegate = (...args: any[]) => {
            const commandString = loxoneCommandFormatter!(...args);
            this.executeLoxoneCommand(commandString);
        }
        this.Endpoint.addCommandHandler(event, delegate);
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

    /**
     * Get the latest initial text event for this device.
     * @param optional UUID to filter the events by. If undefined, all events will be returned.
     * @returns The latest initial event for this device.
     */
    getLatestInitialTextEvent(uuidFilter: string | undefined = undefined): LoxoneTextUpdateEvent | undefined {
        return Utils.getLatestTextEvent(this.initialEvents, uuidFilter);
    }

    /**
     * Get the latest initial text event for this device.
     * @param optional UUID to filter the events by. If undefined, all events will be returned.
     * @returns The latest initial event for this device.
     */
    getLatestInitialValueEvent(uuidFilter: string | undefined = undefined): LoxoneValueUpdateEvent | undefined {
        return Utils.getLatestValueEvent(this.initialEvents, uuidFilter);
    }    
}

export { LoxoneDevice };