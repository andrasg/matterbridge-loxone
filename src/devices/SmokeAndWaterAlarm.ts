import { bridgedNode, powerSource, waterLeakDetector, smokeCoAlarm } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';

class SmokeAndWaterAlarm extends LoxoneDevice {
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      [bridgedNode],
      [],
      'smoke alarm',
      `${SmokeAndWaterAlarm.name}-${structureSection.uuidAction}`,
    );

    let smokeEndpoint = this.Endpoint.addChildDeviceTypeWithClusterServer("smoke alarm", smokeCoAlarm);
    smokeEndpoint.createDefaultBooleanStateClusterServer(false);

    let waterEndpoint = this.Endpoint.addChildDeviceTypeWithClusterServer("water alarm", waterLeakDetector);
    waterEndpoint.createDefaultBooleanStateClusterServer(false);
  }

  override async handleDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;
  }
}

export { SmokeAndWaterAlarm };
