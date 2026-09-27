import type LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import type Control from 'loxone-ts-api/dist/Structure/Control.js';
import { lightSensor, type MatterbridgeEndpoint } from 'matterbridge';
import { IlluminanceMeasurement } from 'matterbridge/matter/clusters';
import { luxToMatter } from 'matterbridge/utils';

import type { DeviceHost } from './DeviceHost.js';
import { SingleDataPointSensor, type ValueOnlyStateNamesType } from './SingleDataPointSensor.js';

class LightSensor extends SingleDataPointSensor<ValueOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, host: DeviceHost) {
    super(control, host, LightSensor.name, 'light sensor', 'value', lightSensor, IlluminanceMeasurement.id, 'measuredValue');

    const latestValueEvent = this.getLatestValueEvent('value');
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint = this.createDefaultEndpoint().createDefaultIlluminanceMeasurementClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueEvent | undefined): number {
    return luxToMatter(event?.value ?? 0);
  }

  static override typeNames(): string[] {
    return ['lightsensor'];
  }
}

export { LightSensor };
