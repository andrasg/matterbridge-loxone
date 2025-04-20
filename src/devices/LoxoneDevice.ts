import { AtLeastOne, DeviceTypeDefinition, MatterbridgeEndpoint, MatterbridgeEndpointCommands, PowerSource } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { LoxoneTextUpdateEvent } from '../data/LoxoneTextUpdateEvent.js';
import { Utils } from '../utils/Utils.js';
import { createHash } from 'crypto';

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
  public platform: LoxonePlatform;
  public typeName: string;
  public deviceTypeDefinitions: AtLeastOne<DeviceTypeDefinition>;
  public uniqueStorageKey: string;
  private batteryUUID: string | undefined;

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
    this.roomname = platform.roomMapping.get(this.structureSection.room) ?? 'Unknown';
    this.name = nameOverride ?? this.structureSection.name;
    this.longname = `${this.roomname} ${this.name}`;
    this.platform = platform;
    this.typeName = typeName;
    this.deviceTypeDefinitions = deviceTypeDefinitions;
    this.uniqueStorageKey = uniqueStorageKey;

    this.Endpoint = this.createDefaultEndpoint();
  }

  public getInitialEvents(): LoxoneUpdateEvent[] {
    return this.platform.initialUpdateEvents
      .filter((event) => this.StatusUUIDs.includes(event.uuid))
      .sort((a, b) => {
        return b.date.getMilliseconds() - a.date.getMilliseconds();
      });
  }


  public registerWithPlatform() {
    this.platform.setSelectDevice(this.Endpoint.serialNumber ?? '', this.Endpoint.deviceName ?? '', undefined, 'hub');

    if (this.platform.validateDevice(this.Endpoint.deviceName ?? '')) {
      this.platform.registerDevice(this.Endpoint);
    }
  }

  public createDefaultEndpoint(): MatterbridgeEndpoint {

    let hash = createHash('sha256').update(this.uniqueStorageKey).digest('hex');
    let serial = hash.substring(0, 16);

    let endpoint = new MatterbridgeEndpoint(this.deviceTypeDefinitions, { uniqueStorageKey: this.uniqueStorageKey }, this.platform.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        this.name,
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

  public WithWiredPower(): LoxoneDevice {
    this.Endpoint.createDefaultPowerSourceWiredClusterServer();
    return this;
  }

  public WithReplacableBattery(batteryUUID: string): LoxoneDevice {
    this.StatusUUIDs.push(batteryUUID);
    this.batteryUUID = batteryUUID;
    let initialValue = this.getLatestInitialValueEvent(batteryUUID);
    let batteryRemaining = initialValue ? initialValue.value : 0;
    this.Endpoint.createDefaultPowerSourceReplaceableBatteryClusterServer(batteryRemaining, this.calculateBatteryStatus(batteryRemaining));
    return this;
  }

  private calculateBatteryStatus(batteryRemaining: number) {
    return batteryRemaining > 40 ? PowerSource.BatChargeLevel.Ok : batteryRemaining > 20 ? PowerSource.BatChargeLevel.Warning : PowerSource.BatChargeLevel.Critical;
  }

  private async handleBatteryEvent(event: LoxoneUpdateEvent) {
    if (event instanceof LoxoneValueUpdateEvent && event.uuid === this.batteryUUID) {
      await this.Endpoint.setAttribute(PowerSource.Cluster.id, 'batPercentRemaining', Math.round(event.value * 2), this.Endpoint.log);
      await this.Endpoint.setAttribute(PowerSource.Cluster.id, 'batChargeLevel', this.calculateBatteryStatus(event.value), this.Endpoint.log);
    }
  }

  private executeLoxoneCommand = (command: string) => {
    this.platform.loxoneConnection.sendCommand(this.structureSection.uuidAction, command);
    this.Endpoint.log.info(`Loxone API command '${command}' called`);
  };

  /**
   * Registers a command handler for the event. The command will be sent to the Loxone API.
   * @param event One of {@link MatterbridgeEndpointCommands}.
   * @param loxoneCommandFormatter Optional function to generate the Loxone command. If not provided, the parameter {@link command} will be used as the Loxone command.
   */
  public addLoxoneCommandHandler(event: keyof MatterbridgeEndpointCommands, loxoneCommandFormatter?: (...args: any[]) => string) {
    if (loxoneCommandFormatter === undefined) {
      loxoneCommandFormatter = () => {
        return event;
      };
    }

    const delegate = (...args: any[]) => {
      const commandString = loxoneCommandFormatter!(...args);
      this.executeLoxoneCommand(commandString);
    };
    this.Endpoint.addCommandHandler(event, delegate);
  }

  /**
   * Handles the Loxone update event raised by the platform. Do not use. Use {@link handleDeviceEvent} instead.
   * @param event The LoxoneUpdateEvent to handle.
   */
  async handleUpdateEvent(event: LoxoneUpdateEvent) {
    await this.handleBatteryEvent(event);

    if (!this.StatusUUIDs.includes(event.uuid)) {
      this.Endpoint?.log.error(`Loxone event: ${event.uuid} received by ${this.StatusUUIDs.join(', ')}`);
      return;
    }

    await this.handleLoxoneDeviceEvent(event);
  }

  /**
   * Handle the device event. Method must be overridden in subclasses.
   * @param event The LoxoneUpdateEvent to handle.
   */
  abstract handleLoxoneDeviceEvent(event: LoxoneUpdateEvent): Promise<void>;

  /**
   * Get the latest initial text event for this device.
   * @param optional UUID to filter the events by. If undefined, all events will be returned.
   * @returns The latest initial event for this device.
   */
  getLatestInitialTextEvent(uuidFilter: string | undefined = undefined): LoxoneTextUpdateEvent | undefined {
    return Utils.getLatestTextEvent(this.getInitialEvents(), uuidFilter);
  }

  /**
   * Get the latest initial text event for this device.
   * @param optional UUID to filter the events by. If undefined, all events will be returned.
   * @returns The latest initial event for this device.
   */
  getLatestInitialValueEvent(uuidFilter: string | undefined = undefined): LoxoneValueUpdateEvent | undefined {
    return Utils.getLatestValueEvent(this.getInitialEvents(), uuidFilter);
  }
}

export { LoxoneDevice };
