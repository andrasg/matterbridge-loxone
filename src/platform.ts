import { Matterbridge, MatterbridgeDynamicPlatform, PlatformConfig } from 'matterbridge';
import { AnsiLogger, YELLOW, LogLevel, CYAN, nf } from 'node-ansi-logger';
import { isValidNumber, isValidString } from 'matterbridge/utils';
import { TemperatureSensor } from './devices/TemperatureSensor.js';
import { LoxoneDevice, ILoxoneDevice } from './devices/LoxoneDevice.js';
import { HumiditySensor } from './devices/HumiditySensor.js';
import { ContactSensor } from './devices/ContactSensor.js';
import { WindowShade } from './devices/WindowShade.js';
import { MotionSensor } from './devices/MotionSensor.js';
import { LightMood } from './devices/LightMood.js';
import { SmokeAlarm } from './devices/SmokeAlarm.js';
import { LightSensor } from './devices/LightSensor.js';
import { WaterLeakSensor } from './devices/WaterLeakSensor.js';
import { OnOffOutlet } from './devices/OnOffOutlet.js';
import { RadioButton } from './devices/RadioButton.js';
import { OnOffSwitch } from './devices/OnOffSwitch.js';
import { OnOffLight } from './devices/OnOffLight.js';
import { OnOffButton } from './devices/OnOffButton.js';
import { PressureSensor } from './devices/PressureSensor.js';
import { GIT_BRANCH, GIT_COMMIT } from './gitInfo.js';
import { AirConditioner } from './devices/AirConditioner.js';
import { PushButton } from './devices/PushButton.js';
import LoxoneClient from 'loxone-ts-api';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';

export class LoxonePlatform extends MatterbridgeDynamicPlatform {
  public loxoneIP: string | undefined = undefined;
  public loxonePort: number | undefined = undefined;
  public loxoneUsername: string | undefined = undefined;
  public loxonePassword: string | undefined = undefined;
  public loxoneClient: LoxoneClient;
  private loxoneUUIDsAndTypes: string[] = [];
  private debug = false;
  private statusDevices = new Map<string, LoxoneDevice[]>();
  private allDevices: LoxoneDevice[] = [];
  private deviceCtorByType: Map<string, ILoxoneDevice> = new Map<string, ILoxoneDevice>();
  private isPluginConfigured = false;
  private isConfigValid = false;
  public initialUpdateEvents: (LoxoneValueEvent | LoxoneTextEvent)[] = [];
  public logEvents = false;
  private dumpControls = false;

  constructor(matterbridge: Matterbridge, log: AnsiLogger, config: PlatformConfig) {
    super(matterbridge, log, config);

    if (config.debug) {
      this.debug = true;
      this.log.info(`${YELLOW}Plugin is running in debug mode${nf}`);
    }
    this.log.logLevel = this.debug ? LogLevel.DEBUG : LogLevel.INFO;

    this.log.info('Initializing Loxone platform');
    this.log.debug(`Code build from branch '${GIT_BRANCH}', commit '${GIT_COMMIT}'`);

    if (config.host) this.loxoneIP = config.host as string;
    if (config.port) this.loxonePort = config.port as number;
    if (config.username) this.loxoneUsername = config.username as string;
    if (config.password) this.loxonePassword = config.password as string;
    if (config.uuidsandtypes) this.loxoneUUIDsAndTypes = config.uuidsandtypes as string[];
    if (config.logevents) this.logEvents = config.logevents as boolean;
    if (config.dumpcontrols) this.dumpControls = config.dumpcontrols as boolean;

    // validate the Loxone config
    if (!isValidString(this.loxoneIP)) {
      throw new Error('Loxone host is not set.');
    }
    if (!isValidNumber(this.loxonePort, 1, 65535)) {
      throw new Error('Loxone port is not set.');
    }
    if (!isValidString(this.loxoneUsername)) {
      throw new Error('Loxone username is not set.');
    }
    if (!isValidString(this.loxonePassword)) {
      throw new Error('Loxone password is not set.');
    }

    this.isConfigValid = true;

    this.loxoneClient = new LoxoneClient(`${this.loxoneIP}:${this.loxonePort}`, this.loxoneUsername, this.loxonePassword, {
      messageLogEnabled: true,
      logAllEvents: this.logEvents,
    });

    if (this.debug) this.loxoneClient.setLogLevel(LogLevel.DEBUG);

    // setup the connection to Loxone
    this.loxoneClient.on('event_value', this.handleLoxoneEvent.bind(this));
    this.loxoneClient.on('event_text', this.handleLoxoneEvent.bind(this));
  }

  override async onStart(reason?: string) {
    if (!this.isConfigValid) {
      throw new Error('Plugin not configured yet, configure first, then restart.');
    }

    this.log.info(`Starting Loxone dynamic platform ${YELLOW}v${this.version}${nf}: ${reason}`);

    // initiate connection
    await this.loxoneClient.connect();

    // get Loxone structure file and parse it
    await this.loxoneClient.getStructureFile();
    await this.loxoneClient.parseStructureFile();

    if (this.dumpControls) {
      this.log.info(`Dumping all Loxone control UUIDs:`);
      this.loxoneClient.controls.forEach((control, uuid) => {
        this.log.info(`${control.room.name}/${control.name}/${control.type} - Control UUID: ${uuid}`);
      });
    }

    // start Loxone event streaming
    await this.loxoneClient.enableUpdates();

    this.log.info('Sleeping for 5 seconds for initial events to arrive...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // wait a bit more if no events
    while (this.initialUpdateEvents.length === 0) {
      this.log.info('Waiting for initial update events to arrive from Loxone...');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    await this.createDeviceRegistry();
    await this.createDevices();

    await this.ready;
    await this.clearSelect();
    this.log.info(`Platform started.`);
  }

  override async onConfigure() {
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

  private async createDeviceRegistry() {
    this.log.info('Reading LoxoneDevice classes...');
    this.deviceCtorByType.clear();

    const subclasses = LoxoneDevice.getRegisteredSubclasses();
    for (const ctor of subclasses) {
      try {
        const names = ctor.typeNames();
        if (!names || names.length === 0) {
          this.log.warn(`Registered device class ${ctor.name} has no static typeNames()`);
          continue;
        }

        for (const name of names) {
          const key = name.toLowerCase();
          if (this.deviceCtorByType.has(key)) {
            this.log.warn(`Device type name '${name}' from ${ctor.name} conflicts with existing registration. Overwriting.`);
          }
          // ctor is typeof LoxoneDevice (possibly abstract). Cast to LoxoneDeviceInterface which
          // models a concrete constructible signature allowing extra args. This is safe because
          // registered subclasses are concrete implementations.
          this.deviceCtorByType.set(key, ctor as unknown as ILoxoneDevice);
          this.log.debug(`Registered device type '${name}' -> ${ctor.name}`);
        }
      } catch (err) {
        this.log.error(`Error registering device constructor ${ctor.name}: ${err}`);
      }
    }
    this.log.info(`Device registry created with ${this.deviceCtorByType.size} type entries.`);
  }

  private async createDevices() {
    this.log.debug(`Received ${this.initialUpdateEvents.length} initial update events from Loxone.`);

    this.log.info('Creating devices...');

    for (const uuidAndType of this.loxoneUUIDsAndTypes) {
      const uuid = uuidAndType.split(',')[0];
      const type = uuidAndType.split(',')[1];

      if (this.loxoneClient.controls.get(uuid) === undefined) {
        this.log.error(`Loxone UUID ${uuid} not found in structure file.`);
        continue;
      }

      const control = this.loxoneClient.controls.get(uuid);

      if (!control) {
        this.log.error(`Loxone control with UUID ${uuid} not found.`);
        continue;
      }

      this.log.debug(`Found Loxone control with UUID ${uuid} type ${control.type}, name ${control.name} in room ${control.room.name}`);

      let device: LoxoneDevice;

      const deviceCtor = this.deviceCtorByType.get(type.toLowerCase());
      if (!deviceCtor) {
        this.log.error(`No registered LoxoneDevice for type '${type}'`);
        continue;
      }
      const additionalParameters = uuidAndType.split(',').slice(2).toString();
      const nameOverride = deviceCtor.nameExtractor(control, this, additionalParameters);

      if (nameOverride) {
        device = new deviceCtor(control, this, nameOverride);
      } else {
        device = new deviceCtor(control, this);
      }

      try {
        switch (type.toLowerCase()) {
          case 'switch':
            this.log.info(`Creating switch device for Loxone control with UUID ${uuid}: ${control.name}`);
            device = new OnOffSwitch(control, this);
            break;
          case 'button':
            this.log.info(`Creating button device for Loxone control with UUID ${uuid}: ${control.name}`);
            device = new OnOffButton(control, this);
            break;
          case 'pushbutton':
            this.log.info(`Creating push button for Loxone control with UUID ${uuid}: ${control.name}`);
            device = new PushButton(control, this);
            break;
          case 'outlet':
            this.log.info(`Creating outlet device for Loxone control with UUID ${uuid}: ${control.name}`);
            device = new OnOffOutlet(control, this);
            break;
          case 'light':
            this.log.info(`Creating light for Loxone control with UUID ${uuid}: ${control.name}`);
            device = new OnOffLight(control, this);
            break;
          case 'temperature':
            this.log.info(`Creating temperature sensor for Loxone control with UUID ${uuid}: ${control.name}`);
            device = new TemperatureSensor(control, this);
            break;
          case 'humidity':
            this.log.info(`Creating humidity sensor for Loxone control with UUID ${uuid}: ${control.name}`);
            device = new HumiditySensor(control, this);
            break;
          case 'contact':
          case 'contactsensor':
            this.log.info(`Creating contact sensor for Loxone control with UUID ${uuid}: ${control.name}`);
            device = new ContactSensor(control, this);
            break;
          case 'occupancy':
          case 'presence':
          case 'motion':
            this.log.info(`Creating motion sensor for Loxone control with UUID ${uuid}: ${control.name}`);
            device = new MotionSensor(control, this);
            break;
          case 'shade':
          case 'shading':
            this.log.info(`Creating window covering for Loxone control with UUID ${uuid}: ${control.name}`);
            device = new WindowShade(control, this);
            break;
          case 'mood': {
            const moodId = parseInt(uuidAndType.split(',')[2]);
            const moodName = LightMood.getMoodName(moodId, this.initialUpdateEvents, control.structureSection.states.moodList);
            this.log.info(`Creating mood for Loxone control with UUID ${uuid}: ${moodName}`);
            device = new LightMood(control, this, moodId, moodName);
            break;
          }
          case 'smoke':
          case 'smokesensor': {
            this.log.info(`Creating smoke alarm for Loxone control with UUID ${uuid}: ${control.name}`);
            const supportsSmoke = control.structureSection.details.availableAlarms & 0x01;
            if (!supportsSmoke) continue;
            device = new SmokeAlarm(control, this);
            break;
          }
          case 'water':
          case 'waterleak':
            this.log.info(`Creating water leak for Loxone control with UUID ${uuid}: ${control.name}`);
            device = new WaterLeakSensor(control, this);
            break;
          case 'lightsensor':
            this.log.info(`Creating light sensor for Loxone control with UUID ${uuid}: ${control.name}`);
            device = new LightSensor(control, this);
            break;
          case 'pressure':
            this.log.info(`Creating pressure sensor for Loxone control with UUID ${uuid}: ${control.name}`);
            device = new PressureSensor(control, this);
            break;
          case 'radio': {
            const outputId = parseInt(uuidAndType.split(',')[2]);
            const outputName = control.structureSection.details.outputs[outputId.toString()];
            this.log.info(`Creating radio button for Loxone control with UUID ${uuid}: ${control.name}`);
            device = new RadioButton(control, this, outputId, outputName);
            break;
          }
          case 'ac':
            this.log.info(`Creating air conditioner for Loxone control with UUID ${uuid}: ${control.name}`);
            device = new AirConditioner(control, this);
            break;
          default:
            this.log.error(`Unknown type ${type} for Loxone control with UUID ${uuid}: ${control.name}`);
            continue;
        }
      } catch (error) {
        this.log.error(`Error creating device for Loxone control with UUID ${uuid}: ${error}`);
        continue;
      }
      // add battery level if battery UUID definition is there
      if (uuidAndType.split(',').some((e) => e.startsWith('battery'))) {
        const batteryUUIDpart = uuidAndType.split(',').find((e) => e.startsWith('battery'));
        if (batteryUUIDpart !== undefined) {
          const batteryUUID = batteryUUIDpart.split('_')[1];
          if (batteryUUID) {
            device.WithReplacableBattery(batteryUUID);
          }
        }
      } else {
        device.WithWiredPower();
      }

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

      this.allDevices.push(device);

      // register with Matterbridge
      await device.registerWithPlatform();
    }
  }

  override async onChangeLoggerLevel(logLevel: LogLevel): Promise<void> {
    if (this.debug) {
      this.log.info('Plugin is running in debug mode, ignoring logger level change');
      return;
    }
    this.log.info(`Setting platform logger level to ${CYAN}${logLevel}${nf}`);
    this.log.logLevel = logLevel;

    for (const bridgedDevice of this.allDevices) {
      bridgedDevice.Endpoint.log.logLevel = logLevel;
    }
    this.log.debug('Changed logger level to ' + logLevel);
  }

  override async onShutdown(reason?: string) {
    await super.onShutdown(reason);
    this.log.info('Shutting down Loxone platform: ' + reason);

    // cleanup Loxone connection and token
    if (this.loxoneClient) await this.loxoneClient.disconnect();
  }

  async handleLoxoneEvent(event: LoxoneValueEvent | LoxoneTextEvent) {
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
        device.handleUpdateEvent(event);
      } catch (error) {
        this.log.error(`Error handling Loxone event for device ${device.longname}: ${error}`);
      }
    }
  }
}
