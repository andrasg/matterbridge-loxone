import {
  type CommandHandlerDataMap,
  type CommandHandlerFunction,
  type CommandHandlerPayload,
  type CommandHandlerResponseMap,
  type DeviceTypeDefinition,
  MatterbridgeEndpoint,
} from "matterbridge";
import type { ActionContext, AtLeastOne, ClusterId } from "matterbridge/matter";
import { PowerSource } from "matterbridge/matter/clusters";
import { createHash } from "node:crypto";
import { BatteryLevelInfo } from "../data/BatteryLevelInfo.js";
import type { DeviceHost } from "./DeviceHost.js";
import LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import LoxoneTextEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";
import type State from "loxone-ts-api/dist/Structure/State.js";
import type { LoxoneEvent } from "loxone-ts-api/dist/LoxoneEvents/LoxoneEvent.js";

export const BASE_STATE_NAMES = ["battery"] as const;
export type BaseStateNameType = (typeof BASE_STATE_NAMES)[number];

export type AdditionalConfig = Record<string, string>;

/**
 * The Matter commands whose handler is not required to return a response.
 *
 * Mirrors how matterbridge resolves `CommandHandlerResponse<T>`: any command absent from
 * `CommandHandlerResponseMap` responds with `void`. In practice that is every command except
 * `DoorLock.getUser`.
 */
type VoidCommandHandlers = Exclude<keyof CommandHandlerDataMap, keyof CommandHandlerResponseMap>;

/**
 * Adapts a handler that returns nothing to the `CommandHandlerFunction<T>` matterbridge expects.
 *
 * `CommandHandlerResponse<T>` is a conditional type. TypeScript cannot evaluate it while `T` is
 * still an unresolved generic, so it rejects a plain `Promise<void>` handler even though every
 * command in `VoidCommandHandlers` resolves the conditional to `void`. Constraining `T` to
 * `VoidCommandHandlers` makes the two types equivalent for every `T` this overload accepts, and
 * the wider implementation signature lets the compiler check the body without a type assertion.
 *
 * @param {function} handler The handler to adapt.
 *
 * @returns {CommandHandlerFunction<T>} The same handler, typed for `MatterbridgeEndpoint`.
 */
function asVoidCommandHandler<T extends VoidCommandHandlers>(
  handler: (data: CommandHandlerPayload<T>) => Promise<void>,
): CommandHandlerFunction<T>;
function asVoidCommandHandler(
  handler: (data: CommandHandlerPayload) => Promise<void>,
): CommandHandlerFunction {
  return handler;
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
  public host: DeviceHost;
  public typeName: string;
  public deviceTypeDefinitions: AtLeastOne<DeviceTypeDefinition>;
  public uniqueStorageKey: string;
  private batteryUUID: string | undefined;
  public statesByName: Map<T | BaseStateNameType, State> = new Map<T | BaseStateNameType, State>();

  constructor(
    control: Control,
    host: DeviceHost,
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
      if (!state.latestEvent)
        throw new Error(`No latest event received for '${stateName}' (${state.uuid.stringValue})`);
      this.statesByName.set(stateName, state);
    }

    this.roomname = control.room.name;
    this.longname = `${this.roomname}/${this.control.name}`;
    this.host = host;
    this.typeName = typeName;
    this.deviceTypeDefinitions = deviceTypeDefinitions;
    this.uniqueStorageKey = uniqueStorageKey;
  }

  /**
   * Creates a default Matterbridge endpoint for the device and adds the default clusters
   * @returns {MatterbridgeEndpoint} The created Matterbridge endpoint.
   */
  public createDefaultEndpoint(): MatterbridgeEndpoint {
    // generate a deterministic serial number based on the unique storage key
    const hash = createHash("sha256").update(this.uniqueStorageKey).digest("hex");
    const serial = hash.substring(0, 16);

    const endpoint = new MatterbridgeEndpoint(
      this.deviceTypeDefinitions,
      { id: this.uniqueStorageKey },
      this.host.config.debug,
    )
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        this.longname,
        serial,
        0xfff1,
        "Matterbridge",
        `Matterbridge ${this.typeName}`,
        Number.parseInt(this.host.version.replace(/\D/g, "")),
        this.host.version === "" ? "Unknown" : this.host.version,
        Number.parseInt(this.host.matterbridgeVersion.replace(/\D/g, "")),
        this.host.matterbridgeVersion,
      );

    endpoint.addCommandHandler("identify", ({ request: { identifyTime } }) => {
      this.host.log.info(`Command identify called identifyTime: ${identifyTime}`);
    });

    return endpoint;
  }

  /**
   * Adds a wired power attribute to the device.
   * @param {PowerSource.WiredCurrentType} wiredCurrentType The type of wired power source. Default is AC.
   * @returns {LoxoneDevice} For chaining.
   */
  public WithWiredPower(
    wiredCurrentType: PowerSource.WiredCurrentType = PowerSource.WiredCurrentType.Ac,
  ): LoxoneDevice {
    this.Endpoint.createDefaultPowerSourceWiredClusterServer(wiredCurrentType);
    return this;
  }

  /**
   * Adds a replaceable battery attribute to the device. The battery UUID must be supplied.
   * @param {string} batteryUUID The UUID of the battery events.
   * @returns {LoxoneDevice} For chaining.
   */
  public WithReplacableBattery(batteryUUID: string): LoxoneDevice {
    this.batteryUUID = batteryUUID;

    // find state
    const batteryState = this.host.getState(batteryUUID);
    if (!batteryState)
      throw new Error(`Could not find state found for batteryUUID '${batteryUUID}'`);

    if (!batteryState.latestEvent)
      throw new Error(`No state received for batteryUUID '${batteryUUID}'`);

    // start listening to battery events
    this.statesByName.set("battery", batteryState);

    // set the initial battery attribute
    const batteryLevelInfo = BatteryLevelInfo.fromEvent(batteryState.latestEvent);
    this.Endpoint.createDefaultPowerSourceReplaceableBatteryClusterServer(
      batteryLevelInfo.batteryRemaining,
      batteryLevelInfo.batteryStatus,
    );

    // for chaining
    return this;
  }

  /**
   * Registers a Loxone command handler for the event. The command will be sent to the Loxone API.
   * @param {T} event One of {@link MatterbridgeEndpointCommands}.
   * @param {} loxoneCommandFormatter Optional function to generate the Loxone command. If not provided, the parameter {@link event} will be used as the Loxone command.
   */
  public addLoxoneCommandHandler<T extends VoidCommandHandlers>(
    event: T,
    loxoneCommandFormatter?: (data: CommandHandlerPayload<T>) => string,
  ): void {
    // if the formatter is not provided, use the event name as the command
    const loxoneCommandFormatterInner = loxoneCommandFormatter ?? ((): string => event);

    // delegate for executing the loxone command
    const delegate = asVoidCommandHandler<T>(async (data) => {
      const commandString = loxoneCommandFormatterInner(data);
      this.Endpoint.log.info(`Calling Loxone API command '${commandString}'`);
      await this.host.sendControlCommand(this.control.structureSection.uuidAction, commandString);
    });

    // register the delegate for the event
    this.Endpoint.addCommandHandler(event, delegate);
  }

  /**
   * Registers a Loxone atrtibute subscription. The command will be sent to the Loxone API.
   * @param {ClusterId} cluster The cluster where the attribute is located.
   * @param {string} attribute The name of the attribute to be subscribed to.
   * @param {function} loxoneCommandFormatter Function to generate the Loxone command(s) from the new value, the old value and the action context. Return undefined to send nothing.
   */
  public addLoxoneAttributeSubscription(
    cluster: ClusterId,
    attribute: string,
    loxoneCommandFormatter: (
      // oxlint-disable-next-line typescript/no-explicit-any
      newValue: any,
      // oxlint-disable-next-line typescript/no-explicit-any
      oldValue: any,
      context: ActionContext,
    ) => string | string[] | undefined,
  ): void {
    // the subscription listener must be synchronous, so the Loxone commands are sent fire-and-forget
    // oxlint-disable-next-line typescript/no-explicit-any
    const delegate = (newValue: any, oldValue: any, context: ActionContext): void => {
      const commandStrings = loxoneCommandFormatter(newValue, oldValue, context);

      if (commandStrings === undefined) {
        return;
      }

      void this.sendLoxoneCommands(
        Array.isArray(commandStrings) ? commandStrings : [commandStrings],
      ).catch((error: unknown) => {
        this.Endpoint.log.error(`Error calling Loxone API command: ${String(error)}`);
      });
    };

    // register the attribute subscription
    this.Endpoint.subscribeAttribute(cluster, attribute, delegate, this.Endpoint.log);
  }

  /**
   * Sends the given commands sequentially to the Loxone API.
   * @param {string[]} commandStrings The Loxone commands to send.
   * @returns {Promise<void>} A promise that resolves when all commands have been sent.
   */
  private async sendLoxoneCommands(commandStrings: string[]): Promise<void> {
    for (const commandString of commandStrings) {
      this.Endpoint.log.info(`Calling Loxone API command '${commandString}'`);
      await this.host.sendControlCommand(this.control.uuidAction, commandString);
    }
  }

  /**
   * Handles the Loxone update event raised by the platform. Only used by the platform to send events to the Loxone devices.
   * @param {LoxoneValueEvent | LoxoneTextEvent} event The LoxoneUpdateEvent to handle.
   */
  async handleUpdateEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void> {
    // handle battery events
    if (event instanceof LoxoneValueEvent && event.uuid.stringValue === this.batteryUUID) {
      await this.handleBatteryEvent(event);
      return;
    }

    this.Endpoint.log.debug(`Event from Loxone: ${event.toString()}`);

    // let the device handle the event
    await this.handleLoxoneDeviceEvent(event);
  }

  protected setNameSuffix(nameSuffix: string): void {
    this.longname += `/${nameSuffix}`;
  }

  private async handleBatteryEvent(event: LoxoneEvent): Promise<void> {
    const batteryLevelInfo = BatteryLevelInfo.fromEvent(event);

    await this.Endpoint.updateAttribute(
      PowerSource.id,
      "batPercentRemaining",
      batteryLevelInfo.batteryRemaining,
      this.Endpoint.log,
    );
    await this.Endpoint.updateAttribute(
      PowerSource.id,
      "batChargeLevel",
      batteryLevelInfo.batteryStatus,
      this.Endpoint.log,
    );
  }

  protected getLatestValueEvent(stateName: T): LoxoneValueEvent {
    const state = this.statesByName.get(stateName);
    if (!state) throw new Error(`State with name '${stateName}' not found`);
    if (!state.latestEvent) throw new Error(`No latest event found for state '${stateName}'`);
    if (!(state.latestEvent instanceof LoxoneValueEvent))
      throw new Error(`Latest event for state ${stateName} is not a value event`);
    return state.latestEvent;
  }

  protected getLatestTextEvent(stateName: T): LoxoneTextEvent {
    const state = this.statesByName.get(stateName);
    if (!state) throw new Error(`State with name '${stateName}' not found`);
    if (!state.latestEvent) throw new Error(`No latest event found for state '${stateName}'`);
    if (!(state.latestEvent instanceof LoxoneTextEvent))
      throw new Error(`Latest event for state ${stateName} is not a text event`);
    return state.latestEvent;
  }

  /**
   * Narrows the untyped state name of an event to one of the state names this device subscribed to.
   * Use it as the subject of a `switch` so the compiler rejects unknown or misspelled state names.
   * @param {LoxoneValueEvent | LoxoneTextEvent} event The event to resolve the state name of.
   * @returns {T | BaseStateNameType | undefined} The state name, or undefined if the event does not belong to a subscribed state.
   */
  protected stateNameOf(
    event: LoxoneValueEvent | LoxoneTextEvent,
  ): T | BaseStateNameType | undefined {
    const stateName = event.state?.name;
    if (stateName === undefined) return undefined;
    for (const knownStateName of this.statesByName.keys()) {
      if (knownStateName === stateName) return knownStateName;
    }
    return undefined;
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

  public async restoreState(): Promise<void> {
    if (this.batteryUUID !== undefined) {
      this.Endpoint.log.debug(`Restoring battery state`);
      const batteryState = this.statesByName.get("battery");
      if (!batteryState?.latestEvent) throw new Error(`Battery state cannot be restored`);
      await this.handleBatteryEvent(batteryState.latestEvent);
    }
    this.Endpoint.log.debug(`Restoring state`);
    await this.populateInitialState();
  }
}

export { LoxoneDevice };
