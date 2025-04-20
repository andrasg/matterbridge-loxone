import { Matterbridge, MatterbridgeDynamicPlatform, PlatformConfig } from 'matterbridge';
import { AnsiLogger } from 'matterbridge/logger';
import { isValidNumber, isValidString } from 'matterbridge/utils';
import { LoxoneConnection } from './services/LoxoneConnection.js';
import { LoxoneUpdateEvent } from './data/LoxoneUpdateEvent.js';
import { SwitchDevice } from './devices/SwitchDevice.js';
import { TemperatureSensor } from './devices/TemperatureSensor.js';
import { LoxoneDevice } from './devices/LoxoneDevice.js';
import { HumiditySensor } from './devices/HumiditySensor.js';
import { ContactSensor } from './devices/ContactSensor.js';
import { WindowShade } from './devices/WindowShade.js';
import { MotionSensor } from './devices/MotionSensor.js';
import { DimmerLight } from './devices/DimmerLight.js';
import { LightMood } from './devices/LightMood.js';
import { SmokeAndWaterAlarm } from './devices/SmokeAndWaterAlarm.js';
import { LightSensor } from './devices/LightSensor.js';

export class LoxonePlatform extends MatterbridgeDynamicPlatform {
  public debugEnabled: boolean;
  public shouldStart: boolean;
  public shouldConfigure: boolean;
  public loxoneIP: string | undefined = undefined;
  public loxonePort: number | undefined = undefined;
  public loxoneUsername: string | undefined = undefined;
  public loxonePassword: string | undefined = undefined;
  public loxoneConnection!: LoxoneConnection;
  public roomMapping: Map<string, string> = new Map<string, string>();
  private loxoneUUIDsAndTypes: string[] = [];

  private statusDevices = new Map<string, LoxoneDevice[]>();
  private structureFile: any | undefined = undefined;
  private isPluginConfigured: boolean = false;
  public initialUpdateEvents: LoxoneUpdateEvent[] = [];

  constructor(matterbridge: Matterbridge, log: AnsiLogger, config: PlatformConfig) {
    super(matterbridge, log, config);

    this.log.info('Initializing Loxone platform');

    this.debugEnabled = config.debug as boolean;
    this.shouldStart = false;
    this.shouldConfigure = false;

    if (config.host) this.loxoneIP = config.host as string;
    if (config.port) this.loxonePort = config.port as number;
    if (config.username) this.loxoneUsername = config.username as string;
    if (config.password) this.loxonePassword = config.password as string;
    if (config.uuidsandtypes) this.loxoneUUIDsAndTypes = config.uuidsandtypes as string[];

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

    this.loxoneConnection = new LoxoneConnection(this.loxoneIP!, this.loxonePort!, this.loxoneUsername!, this.loxonePassword!, this.log);

    this.loxoneConnection.on('get_structure_file', this.onGetStructureFile.bind(this));

    this.loxoneConnection.on('update_value', this.handleLoxoneEvent.bind(this));
    this.loxoneConnection.on('update_text', this.handleLoxoneEvent.bind(this));

    this.loxoneConnection.connect();
  }

  onGetStructureFile(filedata: any) {
    this.structureFile = filedata;
    this.log.info(`Got structure file, last modified: ${filedata.lastModified}`);

    for (const uuid in this.structureFile.rooms) {
      let room = this.structureFile.rooms[uuid];
      this.log.info(`Found Loxone room with UUID ${uuid}, name ${room.name}`);
      this.roomMapping.set(uuid, room.name);
    }
  }

  override async onStart(reason?: string) {
    this.log.info(`Starting Loxone dynamic platform v${this.version}: ` + reason);

    await this.ready;
    await this.clearSelect();
  }

  override async onConfigure() {
    await super.onConfigure();
    this.log.info(`Running onConfigure`);

    // process switches
    for (const uuidAndType of this.loxoneUUIDsAndTypes) {
      let uuid = uuidAndType.split(',')[0];
      let type = uuidAndType.split(',')[1];

      if (!this.structureFile.controls.hasOwnProperty(uuid)) {
        this.log.error(`Loxone UUID ${uuid} not found in structure file.`);
        continue;
      }

      let structureSection = this.structureFile.controls[uuid];
      let roomname = this.structureFile.rooms[structureSection.room].name;
      this.log.info(`Found Loxone control with UUID ${uuid} type ${structureSection.type}, name ${structureSection.name} in room ${roomname}`);

      let device: LoxoneDevice;
      switch (type.toLowerCase()) {
        case 'switch':
          this.log.info(`Creating switch device for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new SwitchDevice(structureSection, this);
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
          this.log.info(`Creating contact sensor for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new ContactSensor(structureSection, this);
          break;
        case 'occupancy':
        case 'presence':
        case 'motion':
          this.log.info(`Creating motion sensor for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new MotionSensor(structureSection, this);
          break;
        case 'shading':
          this.log.info(`Creating window covering for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new WindowShade(structureSection, this);
          break;
        case 'dimmer':
          let subcontrolUUID = uuidAndType.split(',')[2];
          let subSection = structureSection.subControls[subcontrolUUID];
          this.log.info(`Creating dimmer light for Loxone control with UUID ${uuid}: ${subSection.name}`);
          device = new DimmerLight(subSection, this);
          break;
        case 'mood':
          let moodId = parseInt(uuidAndType.split(',')[2]);
          let moodName = LightMood.getMoodName(moodId, this.initialUpdateEvents, structureSection.states.moodList);
          this.log.info(`Creating mood for Loxone control with UUID ${uuid}: ${moodName}`);
          device = new LightMood(structureSection, this, moodId, moodName);
          break;
        case 'smoke':
          this.log.info(`Creating smoke and water alarm for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          continue;
          device = new SmokeAndWaterAlarm(structureSection, this);
          break;
        case 'light':
          this.log.info(`Creating light sensor for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new LightSensor(structureSection, this);
          break;
        default:
          this.log.error(`Unknown type ${type} for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          continue;
      }

      // add battery level if battery UUID definition is there
      if (uuidAndType.split(',').some(e => e.startsWith('battery'))) {
        let batteryUUID = uuidAndType.split(',').find(e => e.startsWith('battery'))?.split('_')[1];
        if (batteryUUID) {
          device.WithReplacableBattery(batteryUUID);
        }
      } else {
        device.WithWiredPower();
      }

      // add all watched status UUIDs to the statusDevices map
      for (const statusUUID of device.StatusUUIDs) {
        if (this.statusDevices.has(statusUUID)) {
          this.statusDevices.get(statusUUID)!.push(device);
        } else {
          this.statusDevices.set(statusUUID, [device]);
        }
      }

      device.registerWithPlatform();
    }
    this.isPluginConfigured = true;
  }

  override async onShutdown(reason?: string) {
    await super.onShutdown(reason);
    this.log.info('Shutting down Loxone platform: ' + reason);

    if (this.loxoneConnection && this.loxoneConnection!.isConnected()) this.loxoneConnection!.disconnect();
  }

  async handleLoxoneEvent(event: LoxoneUpdateEvent) {
    let devices = this.statusDevices.get(event.uuid);

    if (!this.isPluginConfigured) this.initialUpdateEvents.push(event);

    if (!devices) return;

    for (const device of devices) {
      this.log.info(`Loxone event received: ${event.toText()}, handing it off to device ${device.longname}`);
      device.handleUpdateEvent(event);
    }
  }
}
