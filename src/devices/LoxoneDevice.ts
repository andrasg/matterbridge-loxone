import { DeviceTypeDefinition, MatterbridgeEndpoint, MatterbridgeEndpointCommands } from 'matterbridge';
import { AtLeastOne, ClusterId } from 'matterbridge/matter';
import { PowerSource } from 'matterbridge/matter/clusters';
import { createHash } from 'node:crypto';
import { BatteryLevelInfo } from '../data/BatteryLevelInfo.js';
import { LoxoneTextUpdateEvent } from '../data/LoxoneTextUpdateEvent.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { LoxonePlatform } from '../platform.js';
import { getAllEvents, getLatestEvent, getLatestValueEvent } from '../utils/Utils.js';
import { CommandData } from '../utils/CommandData.js';
import { BLUE, GREY, YELLOW } from 'matterbridge/logger';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public structureSection: any;
  public roomname: string;
  public longname: string;
  public platform: LoxonePlatform;
  public typeName: string;
  public deviceTypeDefinitions: AtLeastOne<DeviceTypeDefinition>;
  public uniqueStorageKey: string;
  private batteryUUID: string | undefined;
  public latestEventMap: Map<string, LoxoneUpdateEvent | undefined> = new Map<string, LoxoneUpdateEvent | undefined>();
  private uuidToStateNameMap: Map<string, string> = new Map<string, string>();

  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    structureSection: any,
    platform: LoxonePlatform,
    deviceTypeDefinitions: AtLeastOne<DeviceTypeDefinition>,
    statusUUIDs: string[],
    typeName: string,
    uniqueStorageKey: string,
    nameSuffix: string | undefined = undefined,
  ) {
    this.structureSection = structureSection;
    this.StatusUUIDs = statusUUIDs;
    this.StatusUUIDs.forEach((uuid) => {
      for (const key in this.structureSection.states) {
        if (this.structureSection.states[key] === uuid) {
          this.uuidToStateNameMap.set(uuid, key);
          break;
        }
      }
    });
    this.roomname = platform.roomMapping.get(this.structureSection.room) ?? 'Unknown';
    this.longname = `${this.roomname}/${this.structureSection.name}`;
    if (nameSuffix) {
      this.longname += `/${nameSuffix}`;
    }
    this.platform = platform;
    this.typeName = typeName;
    this.deviceTypeDefinitions = deviceTypeDefinitions;
    this.uniqueStorageKey = uniqueStorageKey;

    // create the endpoint
    this.Endpoint = this.createDefaultEndpoint();

    // log all cached events
    getAllEvents<LoxoneUpdateEvent>(this.platform.initialUpdateEvents, this.StatusUUIDs).forEach((event) => {
      const logLine = this.platform.uuidToLogLineMap.get(event.uuid);
      this.Endpoint.log.debug(`Cached event: ${BLUE}${logLine}${GREY} (${event.uuid}) = ${YELLOW}${event.valueString()}${GREY}`);
    });

    // log all cached events
    getAllEvents<LoxoneUpdateEvent>(this.platform.initialUpdateEvents, this.StatusUUIDs).forEach((event) => {
      const logLine = this.platform.uuidToLogLineMap.get(event.uuid);
      this.Endpoint.log.debug(`Cached event: ${BLUE}${logLine}${GREY} (${event.uuid}) = ${YELLOW}${event.valueString()}${GREY}`);
    });

    // pre-populate with events from the initial update events list
    for (const uuid of this.StatusUUIDs) {
      const latestEvent = getLatestEvent(this.platform.initialUpdateEvents, uuid);
      this.latestEventMap.set(uuid, latestEvent);
      if (!latestEvent) {
        const logLine = this.platform.uuidToLogLineMap.get(uuid);
        this.Endpoint.log.warn(`No latest event found for ${logLine} (${uuid})`);
      }
    }
  }

  /**
   * Registers the device with the Matterbridge platform.
   * This method is called by the LoxonePlatform when the device is created.
   */
  public async registerWithPlatform() {
    this.platform.setSelectDevice(this.Endpoint.serialNumber ?? '', this.Endpoint.deviceName ?? '', undefined, 'hub');

    if (this.platform.validateDevice(this.Endpoint.deviceName ?? '')) {
      await this.platform.registerDevice(this.Endpoint);
    }
  }

  /**
   * Creates a default Matterbridge endpoint for the device and adds the default clusters
   * @returns {MatterbridgeEndpoint} The created Matterbridge endpoint.
   */
  public createDefaultEndpoint(): MatterbridgeEndpoint {
    // generate a deterministic serial number based on the unique storage key
    const hash = createHash('sha256').update(this.uniqueStorageKey).digest('hex');
    const serial = hash.substring(0, 16);

    const endpoint = new MatterbridgeEndpoint(this.deviceTypeDefinitions, { uniqueStorageKey: this.uniqueStorageKey }, this.platform.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        this.longname,
        serial,
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

    return endpoint;
  }

  /**
   * Adds a wired power attribute to the device.
   * @param wiredCurrentType The type of wired power source. Default is AC.
   * @returns {LoxoneDevice} For chaining.
   */
  public WithWiredPower(wiredCurrentType: PowerSource.WiredCurrentType = PowerSource.WiredCurrentType.Ac): LoxoneDevice {
    this.Endpoint.createDefaultPowerSourceWiredClusterServer(wiredCurrentType);
    return this;
  }

  /**
   * Adds a replaceable battery attribute to the device. The battery UUID must be supplied.
   * @param batteryUUID The UUID of the battery events.
   * @returns {LoxoneDevice} For chaining.
   */
  public WithReplacableBattery(batteryUUID: string): LoxoneDevice {
    this.batteryUUID = batteryUUID;

    // start listening to battery events
    this.StatusUUIDs.push(batteryUUID);

    // add the value event to the latestEventMap
    const initialValue = getLatestValueEvent(this.platform.initialUpdateEvents, batteryUUID);
    this.latestEventMap.set(batteryUUID, initialValue);

    // set the initial battery attribute
    const batteryLevelInfo = BatteryLevelInfo.fromEvent(initialValue);
    this.Endpoint.createDefaultPowerSourceReplaceableBatteryClusterServer(batteryLevelInfo.batteryRemaining, batteryLevelInfo.batteryStatus);

    // for chaining
    return this;
  }

  /**
   * Registers a Loxone command handler for the event. The command will be sent to the Loxone API.
   * @param event One of {@link MatterbridgeEndpointCommands}.
   * @param loxoneCommandFormatter Optional function to generate the Loxone command. If not provided, the parameter {@link command} will be used as the Loxone command.
   */
  public addLoxoneCommandHandler(event: keyof MatterbridgeEndpointCommands, loxoneCommandFormatter?: (data: CommandData) => string) {
    // if the formatter is not provided, use the event name as the command
    if (loxoneCommandFormatter === undefined) {
      loxoneCommandFormatter = () => {
        return event;
      };
    }

    // delegate for executing the loxone command
    const delegate = async (data: CommandData) => {
      const commandString = loxoneCommandFormatter?.(data);
      this.Endpoint.log.info(`Calling Loxone API command '${commandString}'`);
      await this.platform.loxoneClient.control(this.structureSection.uuidAction, commandString);
    };

    // register the delegate for the event
    this.Endpoint.addCommandHandler(event, delegate);
  }

  /**
   * Registers a Loxone atrtibute subscription. The command will be sent to the Loxone API.
   * @param cluster The cluster where the attribute is located.
   * @param attribite The name of the attribute to be subscribed to.
   * @param loxoneCommandFormatter Optional function to generate the Loxone command.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public addLoxoneAttributeSubscription(cluster: ClusterId, attribute: string, loxoneCommandFormatter: (newValue: any) => string | string[] | undefined) {
    // prepare the loxone command
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    const delegate = async (newValue: any, oldValue: any, context?: any) => {
      let commandStrings = loxoneCommandFormatter(newValue);

      if (commandStrings === undefined) {
        return;
      }

      if (!Array.isArray(commandStrings)) {
        commandStrings = [commandStrings];
      }

      for (const commandString of commandStrings) {
        this.Endpoint.log.info(`Calling Loxone API command '${commandString}'`);
        await this.platform.loxoneClient.control(this.structureSection.uuidAction, commandString);
      }
    };

    // register the attribute subscription
    this.Endpoint.subscribeAttribute(cluster, attribute, delegate, this.Endpoint.log);
  }

  /**
   * Handles the Loxone update event raised by the platform. Only used by the platform to send events to the Loxone devices.
   * @param event The LoxoneUpdateEvent to handle.
   */
  async handleUpdateEvent(event: LoxoneUpdateEvent) {
    // handle battery events
    if (event instanceof LoxoneValueUpdateEvent && event.uuid === this.batteryUUID) {
      await this.handleBatteryEvent(event);
      return;
    }

    this.Endpoint.log.debug(`Event from Loxone: ${BLUE}${this.uuidToStateNameMap.get(event.uuid) ?? 'unknown'}${GREY} (${event.uuid}) = ${YELLOW}${event.valueString()}${GREY}`);

    // store (overwrite) the latest value in the event map
    this.latestEventMap.set(event.uuid, event);

    // let the device handle the event
    await this.handleLoxoneDeviceEvent(event);
  }

  private async handleBatteryEvent(event: LoxoneValueUpdateEvent) {
    const batteryLevelInfo = BatteryLevelInfo.fromEvent(event);

    await this.Endpoint.updateAttribute(PowerSource.Cluster.id, 'batPercentRemaining', batteryLevelInfo.batteryRemaining, this.Endpoint.log);
    await this.Endpoint.updateAttribute(PowerSource.Cluster.id, 'batChargeLevel', batteryLevelInfo.batteryStatus, this.Endpoint.log);
  }

  /**
   * Handles the Loxone device event. Method must be overridden in subclasses.
   * @param event The LoxoneUpdateEvent to handle.
   */
  abstract handleLoxoneDeviceEvent(event: LoxoneUpdateEvent): Promise<void>;

  /**
   * Asks the device to set its attributes from its internal state. Used in the onConfigure event.
   */
  abstract populateInitialState(): Promise<void>;

  public async restoreState() {
    if (this.batteryUUID !== undefined) {
      const latestValueEvent = this.getLatestValueEvent(this.batteryUUID);
      if (latestValueEvent !== undefined) {
        await this.handleBatteryEvent(latestValueEvent);
      }
    }
    this.Endpoint.log.debug(`Restoring state`);
    await this.populateInitialState();
  }

  public getLatestValueEvent(uuid: string): LoxoneValueUpdateEvent | undefined {
    const latestEvent = this.latestEventMap.get(uuid);
    if (!(latestEvent instanceof LoxoneValueUpdateEvent)) return undefined;

    return latestEvent;
  }

  public getLatestTextEvent(uuid: string): LoxoneTextUpdateEvent | undefined {
    const latestEvent = this.latestEventMap.get(uuid);
    if (!(latestEvent instanceof LoxoneTextUpdateEvent)) return undefined;

    return latestEvent;
  }
}

export { LoxoneDevice };
