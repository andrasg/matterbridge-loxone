import { Matterbridge, MatterbridgeDynamicPlatform, PlatformConfig } from 'matterbridge';
import { AnsiLogger, CYAN, LogLevel, nf } from 'matterbridge/logger';
import { isValidNumber, isValidString } from 'matterbridge/utils';
import { LoxoneConnection } from './services/LoxoneConnection.js';
import { LoxoneUpdateEvent } from './data/LoxoneUpdateEvent.js';
import { TemperatureSensor } from './devices/TemperatureSensor.js';
import { LoxoneDevice } from './devices/LoxoneDevice.js';
import { HumiditySensor } from './devices/HumiditySensor.js';
import { ContactSensor } from './devices/ContactSensor.js';
import { WindowShade } from './devices/WindowShade.js';
import { MotionSensor } from './devices/MotionSensor.js';
import { DimmerLight } from './devices/DimmerLight.js';
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

export class LoxonePlatform extends MatterbridgeDynamicPlatform {
  public loxoneIP: string | undefined = undefined;
  public loxonePort: number | undefined = undefined;
  public loxoneUsername: string | undefined = undefined;
  public loxonePassword: string | undefined = undefined;
  public loxoneConnection!: LoxoneConnection;
  public roomMapping: Map<string, string> = new Map<string, string>();
  private loxoneUUIDsAndTypes: string[] = [];
  private debug = false;
  private statusDevices = new Map<string, LoxoneDevice[]>();
  private allDevices: LoxoneDevice[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private structureFile: any | undefined = undefined;
  private isPluginConfigured = false;
  private isConfigValid = false;
  public initialUpdateEvents: LoxoneUpdateEvent[] = [];

  constructor(matterbridge: Matterbridge, log: AnsiLogger, config: PlatformConfig) {
    super(matterbridge, log, config);

    this.log.info('Initializing Loxone platform');
    this.log.info(`Code build from branch '${GIT_BRANCH}', commit '${GIT_COMMIT}'`);

    if (config.debug) {
      this.debug = true;
      this.log.logLevel = this.config.debug ? LogLevel.DEBUG : LogLevel.INFO;
    }

    if (config.host) this.loxoneIP = config.host as string;
    if (config.port) this.loxonePort = config.port as number;
    if (config.username) this.loxoneUsername = config.username as string;
    if (config.password) this.loxonePassword = config.password as string;
    if (config.uuidsandtypes) this.loxoneUUIDsAndTypes = config.uuidsandtypes as string[];

    // validate the Loxone config
    if (!isValidString(this.loxoneIP)) {
      this.log.error('Loxone host is not set.');
      return;
    }
    if (!isValidNumber(this.loxonePort, 1, 65535)) {
      this.log.error('Loxone port is not set.');
      return;
    }
    if (!isValidString(this.loxoneUsername)) {
      this.log.error('Loxone username is not set.');
      return;
    }
    if (!isValidString(this.loxonePassword)) {
      this.log.error('Loxone password is not set.');
      return;
    }

    this.isConfigValid = true;

    // setup the connection to Loxone
    this.loxoneConnection = new LoxoneConnection(this.loxoneIP, this.loxonePort, this.loxoneUsername, this.loxonePassword, this.log);
    this.loxoneConnection.on('get_structure_file', this.onGetStructureFile.bind(this));
    this.loxoneConnection.on('update_value', this.handleLoxoneEvent.bind(this));
    this.loxoneConnection.on('update_text', this.handleLoxoneEvent.bind(this));
    this.loxoneConnection.connect();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onGetStructureFile(filedata: any) {
    this.structureFile = filedata;
    this.log.info(`Got structure file, last modified: ${filedata.lastModified}`);

    for (const uuid in this.structureFile.rooms) {
      const room = this.structureFile.rooms[uuid];
      this.log.info(`Found Loxone room with UUID ${uuid}, name ${room.name}`);
      this.roomMapping.set(uuid, room.name);
    }
  }

  override async onStart(reason?: string) {
    if (!this.isConfigValid) {
      throw new Error('Plugin not configured yet, configure first, then restart.');
    }

    this.log.info(`Starting Loxone dynamic platform v${this.version}: ` + reason);
    await this.createDevices();

    await this.ready;
    await this.clearSelect();
  }

  override async onConfigure() {
    await super.onConfigure();
    this.log.info(`Running onConfigure`);

    for (const device of this.allDevices) {
      await device.restoreState();
    }

    this.isPluginConfigured = true;
    this.initialUpdateEvents = [];
  }

  private async createDevices() {
    while (this.structureFile === undefined) {
      this.log.info('Waiting for structure file to be received from Loxone...');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (this.loxoneUUIDsAndTypes.length !== 0) {
      while (this.initialUpdateEvents.length === 0) {
        this.log.info('Waiting for initial update events to arrive from Loxone...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    this.log.info('Creating devices...');

    for (const uuidAndType of this.loxoneUUIDsAndTypes) {
      const uuid = uuidAndType.split(',')[0];
      const type = uuidAndType.split(',')[1];

      if (this.structureFile.controls[uuid] === undefined) {
        this.log.error(`Loxone UUID ${uuid} not found in structure file.`);
        continue;
      }

      const structureSection = this.structureFile.controls[uuid];
      const roomname = this.structureFile.rooms[structureSection.room].name;
      this.log.info(`Found Loxone control with UUID ${uuid} type ${structureSection.type}, name ${structureSection.name} in room ${roomname}`);

      let device: LoxoneDevice;
      switch (type.toLowerCase()) {
        case 'switch':
          this.log.info(`Creating switch device for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new OnOffSwitch(structureSection, this);
          break;
        case 'button':
          this.log.info(`Creating button device for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new OnOffButton(structureSection, this);
          break;
        case 'pushbutton':
          this.log.info(`Creating push button for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new PushButton(structureSection, this);
          break;
        case 'outlet':
          this.log.info(`Creating outlet device for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new OnOffOutlet(structureSection, this);
          break;
        case 'light':
          this.log.info(`Creating light for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new OnOffLight(structureSection, this);
          break;
        case 'temperature':
          this.log.info(`Creating temperature sensor for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new TemperatureSensor(structureSection, this);
          break;
        case 'humidity':
          this.log.info(`Creating humidity sensor for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new HumiditySensor(structureSection, this);
          break;
        case 'contact':
        case 'contactsensor':
          this.log.info(`Creating contact sensor for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new ContactSensor(structureSection, this);
          break;
        case 'occupancy':
        case 'presence':
        case 'motion':
          this.log.info(`Creating motion sensor for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new MotionSensor(structureSection, this);
          break;
        case 'shade':
        case 'shading':
          this.log.info(`Creating window covering for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new WindowShade(structureSection, this);
          break;
        case 'dimmer': {
          const subcontrolUUID = uuidAndType.split(',')[2];
          const subSection = structureSection.subControls[subcontrolUUID];
          this.log.info(`Creating dimmer light for Loxone control with UUID ${uuid}: ${subSection.name}`);
          device = new DimmerLight(subSection, this);
          break;
        }
        case 'mood': {
          const moodId = parseInt(uuidAndType.split(',')[2]);
          const moodName = LightMood.getMoodName(moodId, this.initialUpdateEvents, structureSection.states.moodList);
          this.log.info(`Creating mood for Loxone control with UUID ${uuid}: ${moodName}`);
          device = new LightMood(structureSection, this, moodId, moodName);
          break;
        }
        case 'smoke':
        case 'smokesensor': {
          this.log.info(`Creating smoke alarm for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          const supportsSmoke = structureSection.details.availableAlarms & 0x01;
          if (!supportsSmoke) continue;
          device = new SmokeAlarm(structureSection, this);
          break;
        }
        case 'water':
        case 'waterleak':
          this.log.info(`Creating water leak for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new WaterLeakSensor(structureSection, this);
          break;
        case 'lightsensor':
          this.log.info(`Creating light sensor for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new LightSensor(structureSection, this);
          break;
        case 'pressure':
          this.log.info(`Creating pressure sensor for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new PressureSensor(structureSection, this);
          break;
        case 'radio': {
          const outputId = parseInt(uuidAndType.split(',')[2]);
          const outputName = structureSection.details.outputs[outputId.toString()];
          this.log.info(`Creating radio button for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new RadioButton(structureSection, this, outputId, outputName);
          break;
        }
        case 'ac':
          this.log.info(`Creating air conditioner for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new AirConditioner(structureSection, this);
          break;
        default:
          this.log.error(`Unknown type ${type} for Loxone control with UUID ${uuid}: ${structureSection.name}`);
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
      }

      // add all watched status UUIDs to the statusDevices map
      for (const statusUUID of device.StatusUUIDs) {
        if (this.statusDevices.has(statusUUID)) {
          const devices = this.statusDevices.get(statusUUID);
          if (devices !== undefined) {
            devices.push(device);
          }
        } else {
          this.statusDevices.set(statusUUID, [device]);
        }
      }

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

    if (this.loxoneConnection && this.loxoneConnection.isConnected()) this.loxoneConnection.disconnect();
  }

  async handleLoxoneEvent(event: LoxoneUpdateEvent) {
    // store event in the initial cache if the plugin is not configured yet
    if (!this.isPluginConfigured) this.initialUpdateEvents.push(event);

    const devices = this.statusDevices.get(event.uuid);
    if (!devices) return;

    for (const device of devices) {
      if (!device.StatusUUIDs.includes(event.uuid)) continue;

      this.log.info(`Loxone event received: ${event.toText()}, handing it off to device ${device.longname}`);
      device.handleUpdateEvent(event);
    }
  }
}
