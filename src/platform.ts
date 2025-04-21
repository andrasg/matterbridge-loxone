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
import { SmokeAlarm } from './devices/SmokeAlarm.js';
import { LightSensor } from './devices/LightSensor.js';
import { WaterLeakSensor } from './devices/WaterLeakSensor.js';
import { OutletDevice } from './devices/OutletDevice.js';
import { RadioButton } from './devices/RadioButton.js';

export class LoxonePlatform extends MatterbridgeDynamicPlatform {
  public debugEnabled: boolean;
  public loxoneIP: string | undefined = undefined;
  public loxonePort: number | undefined = undefined;
  public loxoneUsername: string | undefined = undefined;
  public loxonePassword: string | undefined = undefined;
  public loxoneConnection!: LoxoneConnection;
  public roomMapping: Map<string, string> = new Map<string, string>();
  private loxoneUUIDsAndTypes: string[] = [];

  private statusDevices = new Map<string, LoxoneDevice[]>();
  private allDevices: LoxoneDevice[] = [];
  private structureFile: any | undefined = undefined;
  private isPluginConfigured: boolean = false;
  public initialUpdateEvents: LoxoneUpdateEvent[] = [];

  constructor(matterbridge: Matterbridge, log: AnsiLogger, config: PlatformConfig) {
    super(matterbridge, log, config);

    this.log.info('Initializing Loxone platform');

    this.debugEnabled = config.debug as boolean;

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

    // setup the connection to Loxone
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
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

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
        case 'outlet':
          this.log.info(`Creating outlet device for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new OutletDevice(structureSection, this);
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
          this.log.info(`Creating smoke alarm for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          let supportsSmoke = structureSection.details.availableAlarms & 0x01;
          if (!supportsSmoke) continue;
          device = new SmokeAlarm(structureSection, this);
          break;
        case 'water':
          this.log.info(`Creating water leak for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new WaterLeakSensor(structureSection, this);
          break;
        case 'light':
          this.log.info(`Creating light sensor for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new LightSensor(structureSection, this);
          break;
        case 'radio':
          let outputId = parseInt(uuidAndType.split(',')[2]);
          let outputName = structureSection.details.outputs[outputId.toString()];
          this.log.info(`Creating radio button for Loxone control with UUID ${uuid}: ${structureSection.name}`);
          device = new RadioButton(structureSection, this, outputId, outputName);
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
      } 
      
      // add all watched status UUIDs to the statusDevices map
      for (const statusUUID of device.StatusUUIDs) {
        if (this.statusDevices.has(statusUUID)) {
          this.statusDevices.get(statusUUID)!.push(device);
        } else {
          this.statusDevices.set(statusUUID, [device]);
        }
      }

      this.allDevices.push(device);

      // register with Matterbridge
      await device.registerWithPlatform();
    }
  }

  override async onShutdown(reason?: string) {
    await super.onShutdown(reason);
    this.log.info('Shutting down Loxone platform: ' + reason);

    if (this.loxoneConnection && this.loxoneConnection.isConnected()) this.loxoneConnection.disconnect();
  }

  async handleLoxoneEvent(event: LoxoneUpdateEvent) {
    // store event in the initial cache if the plugin is not configured yet
    if (!this.isPluginConfigured) this.initialUpdateEvents.push(event);

    let devices = this.statusDevices.get(event.uuid);
    if (!devices) return;

    for (const device of devices) {
      if (!device.StatusUUIDs.includes(event.uuid)) continue;

      this.log.info(`Loxone event received: ${event.toText()}, handing it off to device ${device.longname}`);
      device.handleUpdateEvent(event);
    }
  }
}
