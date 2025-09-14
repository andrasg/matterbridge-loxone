import { DeviceTypeDefinition, MatterbridgeEndpoint, MatterbridgeEndpointCommands } from 'matterbridge';
import { AtLeastOne, ClusterId } from 'matterbridge/matter';
import { PowerSource } from 'matterbridge/matter/clusters';
import { createHash } from 'node:crypto';
import { BatteryLevelInfo } from '../data/BatteryLevelInfo.js';
import { LoxonePlatform } from '../platform.js';
import { CommandData } from '../utils/CommandData.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';
import State from 'loxone-ts-api/dist/Structure/State.js';
import { LoxoneEvent } from 'loxone-ts-api/dist/LoxoneEvents/LoxoneEvent.js';

export const BASE_STATE_NAMES = ['battery'] as const;
export type BaseStateNameType = (typeof BASE_STATE_NAMES)[number];

// interface for allowing maintenance of device registry
export interface ILoxoneDevice {
  // allow additional constructor arguments for device subclasses that require extra params
  new (control: Control, platform: LoxonePlatform, nameOverride?: string): LoxoneDevice;
  typeNames(): string[];
  nameExtractor(control: Control, platform: LoxonePlatform, additionalConfig: string): string | undefined;
}

// decorator function for allowing registration of a device type
export function RegisterDevice<T extends ILoxoneDevice>(ctor: T): T {
  LoxoneDevice.registerSubclass(ctor as unknown as typeof LoxoneDevice);
  return ctor;
}

/**
 * Base class for Loxone devices. This class should be extended by all Loxone device classes.
 */
abstract class LoxoneDevice<T extends string = string> {
  // Endpoint is created by the base class constructor so subclasses can safely use it
  public abstract Endpoint: MatterbridgeEndpoint;
  public control: Control;
  public roomname: string;
  public longname: string;
  public platform: LoxonePlatform;
  public typeName: string;
  public deviceTypeDefinitions: AtLeastOne<DeviceTypeDefinition>;
  public uniqueStorageKey: string;
  private batteryUUID: string | undefined;
  public statesByName: Map<T | BaseStateNameType, State> = new Map<T | BaseStateNameType, State>();

  private static _deviceRegistry: (typeof LoxoneDevice)[] = [];

  constructor(
    control: Control,
    platform: LoxonePlatform,
    deviceTypeDefinitions: AtLeastOne<DeviceTypeDefinition>,
    stateNames: readonly T[],
    typeName: string,
    uniqueStorageKey: string,
  ) {
    this.control = control;

    // find all states we are interested in and ensure we have a latest value
    for (const stateName of stateNames) {
      const state = control.statesByName.get(stateName);
      if (!state) throw new Error(`Could not find state found for '${stateName}'`);
      if (!state.latestEvent) throw new Error(`No latest event received for '${stateName}' (${state.uuid.stringValue})`);
      this.statesByName.set(state.name as T, state);
    }

    this.roomname = control.room.name;
    this.longname = `${this.roomname}/${this.control.name}`;
    this.platform = platform;
    this.typeName = typeName;
    this.deviceTypeDefinitions = deviceTypeDefinitions;
    this.uniqueStorageKey = uniqueStorageKey;
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

  public static registerSubclass(ctor: typeof LoxoneDevice): void {
    if (!LoxoneDevice._deviceRegistry.includes(ctor)) {
      LoxoneDevice._deviceRegistry.push(ctor);
    }
  }

  public static getRegisteredSubclasses(): (typeof LoxoneDevice)[] {
    return [...LoxoneDevice._deviceRegistry];
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

    // find state
    const batteryState = this.platform.loxoneClient.states.get(batteryUUID);
    if (!batteryState) throw new Error(`Could not find state found for batteryUUID '${batteryUUID}'`);

    if (!batteryState.latestEvent) throw new Error(`No state received for batteryUUID '${batteryUUID}'`);

    // start listening to battery events
    this.statesByName.set('battery' as T, batteryState);

    // set the initial battery attribute
    const batteryLevelInfo = BatteryLevelInfo.fromEvent(batteryState.latestEvent);
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
      await this.platform.loxoneClient.control(this.control.structureSection.uuidAction, commandString);
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
        await this.platform.loxoneClient.control(this.control.uuidAction, commandString);
      }
    };

    // register the attribute subscription
    this.Endpoint.subscribeAttribute(cluster, attribute, delegate, this.Endpoint.log);
  }

  /**
   * Handles the Loxone update event raised by the platform. Only used by the platform to send events to the Loxone devices.
   * @param event The LoxoneUpdateEvent to handle.
   */
  async handleUpdateEvent(event: LoxoneValueEvent | LoxoneTextEvent) {
    // handle battery events
    if (event instanceof LoxoneValueEvent && event.uuid.stringValue === this.batteryUUID) {
      await this.handleBatteryEvent(event);
      return;
    }

    this.Endpoint.log.debug(`Event from Loxone: ${event.toString()}`);

    // let the device handle the event
    await this.handleLoxoneDeviceEvent(event);
  }

  protected setNameSuffix(nameSuffix: string) {
    this.longname += `/${nameSuffix}`;
  }

  private async handleBatteryEvent(event: LoxoneEvent) {
    const batteryLevelInfo = BatteryLevelInfo.fromEvent(event);

    await this.Endpoint.updateAttribute(PowerSource.Cluster.id, 'batPercentRemaining', batteryLevelInfo.batteryRemaining, this.Endpoint.log);
    await this.Endpoint.updateAttribute(PowerSource.Cluster.id, 'batChargeLevel', batteryLevelInfo.batteryStatus, this.Endpoint.log);
  }

  protected getLatestValueEvent(stateName: T): LoxoneValueEvent {
    const state = this.statesByName.get(stateName);
    if (!state) throw new Error(`State with name '${stateName}' not found`);
    if (!state.latestEvent) throw new Error(`No latest event found for state '${stateName}'`);
    if (!(state.latestEvent instanceof LoxoneValueEvent)) throw new Error(`Latest event for state ${stateName} is not a value event`);
    return state.latestEvent as LoxoneValueEvent;
  }

  protected getLatestTextEvent(stateName: T): LoxoneTextEvent {
    const state = this.statesByName.get(stateName);
    if (!state) throw new Error(`State with name '${stateName}' not found`);
    if (!state.latestEvent) throw new Error(`No latest event found for state '${stateName}'`);
    if (!(state.latestEvent instanceof LoxoneTextEvent)) throw new Error(`Latest event for state ${stateName} is not a text event`);
    return state.latestEvent as LoxoneTextEvent;
  }

  /**
   * Handles the Loxone device event. Method must be overridden in subclasses.
   * @param event The LoxoneUpdateEvent to handle.
   */
  abstract handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void>;

  /**
   * Asks the device to set its attributes from its internal state. Used in the onConfigure event.
   */
  abstract populateInitialState(): Promise<void>;

  /**
   * Returns the list of short type names that the identify the device in the configuration.
   * @returns {string[]} The list of type names.
   */
  static typeNames(): string[] {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static nameExtractor(control: Control, platform: LoxonePlatform, additionalConfig: string): string | undefined {
    return undefined;
  }

  public async restoreState() {
    if (this.batteryUUID !== undefined) {
      this.Endpoint.log.debug(`Restoring battery state`);
      const batteryState = this.statesByName.get('battery' as T);
      if (!batteryState || !batteryState.latestEvent) throw new Error(`Battery state cannot be restored`);
      await this.handleBatteryEvent(batteryState.latestEvent);
    }
    this.Endpoint.log.debug(`Restoring state`);
    await this.populateInitialState();
  }
}

export { LoxoneDevice };
