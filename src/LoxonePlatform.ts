import {
  MatterbridgeDynamicPlatform,
  type MatterbridgeEndpoint,
  type PlatformMatterbridge,
} from "matterbridge";
import { type AnsiLogger, YELLOW, LogLevel, CYAN, nf } from "matterbridge/logger";
import { isValidNumber, isValidString } from "matterbridge/utils";
import type { DeviceHost } from "./devices/DeviceHost.js";
import type { LoxoneDevice } from "./devices/LoxoneDevice.js";
import { deviceFactories } from "./devices/DeviceFactory.js";
import { GIT_BRANCH, GIT_COMMIT } from "./gitInfo.js";
import LoxoneClient from "loxone-ts-api";
import type LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type LoxoneTextEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js";
import type State from "loxone-ts-api/dist/Structure/State.js";
import type { LoxonePlatformConfig } from "./LoxonePlatformConfig.js";

export class LoxonePlatform extends MatterbridgeDynamicPlatform implements DeviceHost {
  public loxoneClient: LoxoneClient;
  private statusDevices = new Map<string, LoxoneDevice[]>();
  private allDevices: LoxoneDevice[] = [];
  private isPluginConfigured = false;
  private isConfigValid = false;
  public initialUpdateEvents: (LoxoneValueEvent | LoxoneTextEvent)[] = [];

  constructor(
    matterbridge: PlatformMatterbridge,
    log: AnsiLogger,
    override config: LoxonePlatformConfig,
  ) {
    super(matterbridge, log, config);

    // Verify that Matterbridge is the correct version
    if (
      this.verifyMatterbridgeVersion === undefined ||
      typeof this.verifyMatterbridgeVersion !== "function" ||
      !this.verifyMatterbridgeVersion("3.5.2")
    ) {
      throw new Error(
        `This plugin requires Matterbridge version >= "3.5.2". Please update Matterbridge from ${this.matterbridge.matterbridgeVersion} to the latest version in the frontend.`,
      );
    }

    if (this.config.debug) {
      this.log.info(`${YELLOW}Plugin is running in debug mode${nf}`);
    }
    this.log.logLevel = this.config.debug ? LogLevel.DEBUG : LogLevel.INFO;

    this.log.info(`Initializing platform ${this.config.name}`);
    this.log.debug(`Code build from branch '${GIT_BRANCH}', commit '${GIT_COMMIT}'`);

    // validate the Loxone config
    if (!isValidString(this.config.host)) {
      throw new Error("Loxone host is not set.");
    }
    if (!isValidNumber(this.config.port, 1, 65535)) {
      throw new Error("Loxone port is not set.");
    }
    if (!isValidString(this.config.username)) {
      throw new Error("Loxone username is not set.");
    }
    if (!isValidString(this.config.password)) {
      throw new Error("Loxone password is not set.");
    }

    this.isConfigValid = true;

    this.loxoneClient = new LoxoneClient(
      `${this.config.host}:${this.config.port}`,
      this.config.username,
      this.config.password,
      {
        messageLogEnabled: true,
        logAllEvents: this.config.logevents,
      },
    );

    if (this.config.debug) this.loxoneClient.setLogLevel("debug");

    // setup the connection to Loxone
    this.loxoneClient.on("event_value", (event) => {
      void this.handleLoxoneEvent(event);
    });
    this.loxoneClient.on("event_text", (event) => {
      void this.handleLoxoneEvent(event);
    });
  }

  /**
   * The version of the running Matterbridge instance. Part of the {@link DeviceHost} contract.
   *
   * @returns {string} The Matterbridge version.
   */
  get matterbridgeVersion(): string {
    return this.matterbridge.matterbridgeVersion;
  }

  /**
   * Looks up a Loxone state by its UUID. Part of the {@link DeviceHost} contract.
   *
   * @param {string} uuid The state UUID as a string.
   *
   * @returns {State | undefined} The state, or `undefined` when no state with that UUID exists.
   */
  getState(uuid: string): State | undefined {
    return this.loxoneClient.states.get(uuid);
  }

  /**
   * Sends a command to a Loxone control. Part of the {@link DeviceHost} contract.
   *
   * @param {string} uuidAction The UUID of the control to send the command to.
   * @param {string} command The Loxone command string, e.g. `on`, `off` or `setTarget/21`.
   *
   * @returns {Promise<void>} Resolves once the command has been sent.
   */
  async sendControlCommand(uuidAction: string, command: string): Promise<void> {
    await this.loxoneClient.control(uuidAction, command);
  }

  override async onStart(reason?: string): Promise<void> {
    if (!this.isConfigValid) {
      throw new Error("Plugin not configured yet, configure first, then restart.");
    }

    this.log.info(`Starting Loxone dynamic platform ${YELLOW}v${this.version}${nf}: ${reason}`);

    // initiate connection
    await this.loxoneClient.connect();

    // get Loxone structure file and parse it
    await this.loxoneClient.getStructureFile();
    await this.loxoneClient.parseStructureFile();

    if (this.config.dumpcontrols) {
      this.log.info(`Dumping all Loxone control UUIDs:`);
      this.loxoneClient.controls.forEach((control, uuid) => {
        this.log.info(
          `${control.room.name}/${control.name}/${control.type} - Control UUID: ${uuid}`,
        );
      });
    }

    if (this.config.dumpstates) {
      this.log.info(`Dumping all Loxone state UUIDs:`);
      this.loxoneClient.states.forEach((state, uuid) => {
        this.log.info(
          `${state.parentControl.room.name}/${state.parentControl.name}/${state.name} - State UUID: ${uuid}`,
        );
      });
    }

    // start Loxone event streaming
    await this.loxoneClient.enableUpdates();

    this.log.info("Sleeping for 5 seconds for initial events to arrive...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // wait a bit more if no events
    while (this.initialUpdateEvents.length === 0) {
      this.log.info("Waiting for initial update events to arrive from Loxone...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    await this.createDevices();

    await this.ready;
    await this.clearSelect();
    this.log.info(`Platform started.`);
  }

  override async onConfigure(): Promise<void> {
    await super.onConfigure();
    this.log.info(`Running onConfigure`);

    for (const device of this.allDevices) {
      await device.restoreState();
    }

    this.isPluginConfigured = true;

    // empty the initial update events cache as it's no longer needed
    this.initialUpdateEvents = [];
    this.log.info(`Platform configured.`);
  }

  private async createDevices(): Promise<void> {
    this.log.debug(
      `Received ${this.initialUpdateEvents.length} initial update events from Loxone.`,
    );

    this.log.info("Creating devices...");

    for (const uuidAndType of this.config.uuidsandtypes) {
      try {
        await this.createDevice(uuidAndType);
      } catch (error) {
        this.log.error(`Error creating device for config '${uuidAndType}': ${String(error)}`);
      }
    }
  }

  private async createDevice(uuidAndType: string): Promise<void> {
    const configParts = uuidAndType.split(",");
    if (configParts.length < 2) {
      throw new Error(
        `Invalid uuidsandtypes entry: '${uuidAndType}', must be at least 'UUID,type'`,
      );
    }

    const controlUuid = configParts[0];
    const type = configParts[1];

    // parse additional config key=value pairs
    const additionalConfig: Record<string, string> = {};
    for (let i = 2; i < configParts.length; i++) {
      const config = configParts[i];
      if (!config.includes("=")) {
        this.log.warn(
          `Invalid config entry for ${controlUuid}: '${config}', must be in 'key=value' format`,
        );
        continue;
      }
      const key = config.split("=")[0];
      const value = config.split("=")[1];
      additionalConfig[key] = value;
    }

    // find a control with the specified UUID
    if (this.loxoneClient.controls.get(controlUuid) === undefined) {
      throw new Error(`Loxone UUID ${controlUuid} not found in structure file.`);
    }
    const control = this.loxoneClient.controls.get(controlUuid);

    if (!control) {
      throw new Error(`Loxone control with UUID ${controlUuid} not found.`);
    }

    this.log.debug(
      `Found Loxone control with UUID ${controlUuid} type ${control.type}, name ${control.name} in room ${control.room.name}`,
    );

    const deviceFactory = deviceFactories.get(type.toLowerCase());
    if (!deviceFactory) {
      throw new Error(`No registered LoxoneDevice for type '${type}'`);
    }

    const device = deviceFactory(control, this, additionalConfig);

    this.log.info(`Created device of type '${type}': ${device.longname}`);

    // add battery level if battery UUID definition is there
    const batteryUUID = additionalConfig["battery"];
    if (batteryUUID) {
      device.WithReplacableBattery(batteryUUID);
    } else {
      device.WithWiredPower();
    }

    // pick up states that are related to the device
    for (const deviceState of device.statesByName.values()) {
      // filter loxoneClient event emitting by only relevant UUIDs
      this.loxoneClient.addUuidToWatchList(deviceState.uuid.stringValue);

      // add all watched status UUIDs to the statusDevices map
      if (this.statusDevices.has(deviceState.uuid.stringValue)) {
        const devices = this.statusDevices.get(deviceState.uuid.stringValue);
        if (devices !== undefined) {
          devices.push(device);
        }
      } else {
        this.statusDevices.set(deviceState.uuid.stringValue, [device]);
      }
    }

    // add potentially missing types
    device.Endpoint.addRequiredClusterServers();

    // keep reference to the device
    this.allDevices.push(device);

    // register with Matterbridge
    await this.registerEndpoint(device.Endpoint);
  }

  /**
   * Offers an endpoint to the user for selection and registers it with Matterbridge when validated.
   *
   * @param {MatterbridgeEndpoint} endpoint The endpoint of a created device.
   *
   * @returns {Promise<void>} Resolves once the endpoint has been registered or skipped.
   */
  private async registerEndpoint(endpoint: MatterbridgeEndpoint): Promise<void> {
    this.setSelectDevice(endpoint.serialNumber ?? "", endpoint.deviceName ?? "", undefined, "hub");

    if (this.validateDevice(endpoint.deviceName ?? "")) {
      await this.registerDevice(endpoint);
    }
  }

  // oxlint-disable-next-line typescript/require-await
  override async onChangeLoggerLevel(logLevel: LogLevel): Promise<void> {
    if (this.config.debug) {
      this.log.info("Plugin is running in debug mode, ignoring logger level change");
      return;
    }
    this.log.info(`Setting platform logger level to ${CYAN}${logLevel}${nf}`);
    this.log.logLevel = logLevel;

    for (const bridgedDevice of this.allDevices) {
      bridgedDevice.Endpoint.log.logLevel = logLevel;
    }
    this.log.debug("Changed logger level to " + logLevel);
  }

  override async onShutdown(reason?: string): Promise<void> {
    await super.onShutdown(reason);
    this.log.info("Shutting down Loxone platform: " + reason);

    // cleanup Loxone connection and token
    if (this.loxoneClient) await this.loxoneClient.disconnect();
  }

  async handleLoxoneEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void> {
    // store event in the initial cache if the plugin is not configured yet
    if (!this.isPluginConfigured) {
      this.initialUpdateEvents.push(event);
    }

    const devices = this.statusDevices.get(event.uuid.stringValue);
    if (!devices) {
      // event is not for a UUID that any device is listening to, ignore event
      return;
    }

    for (const device of devices) {
      try {
        await device.handleUpdateEvent(event);
      } catch (error) {
        this.log.error(
          `Error handling Loxone event for device ${device.longname}: ${String(error)}`,
        );
      }
    }
  }
}
