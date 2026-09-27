import type LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import type Control from 'loxone-ts-api/dist/Structure/Control.js';
import { type MatterbridgeEndpoint, pressureSensor } from 'matterbridge';
import { PressureMeasurement } from 'matterbridge/matter/clusters';

import type { DeviceHost } from './DeviceHost.js';
import { type ValueOnlyStateNamesType, SingleDataPointSensor } from './SingleDataPointSensor.js';

const minPressureHpa = -32768;
const maxPressureHpa = 32767;

class PressureSensor extends SingleDataPointSensor<ValueOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, host: DeviceHost) {
    super(control, host, PressureSensor.name, 'pressure sensor', 'value', pressureSensor, PressureMeasurement.id, 'measuredValue');

    const latestValueEvent = this.getLatestValueEvent('value');
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint = this.createDefaultEndpoint().createDefaultPressureMeasurementClusterServer(initialValue);
  }

  /**
   * Encode hPa (mbar) as whole Matter pressure units (0.1 kPa).
   * Missing or non-finite readings return zero; finite readings are rounded and clamped to int16.
   *
   * @param {LoxoneValueEvent | undefined} event Source reading in hPa (mbar).
   * @returns {number} Integer pressure in the range -32768 to 32767.
   */
  override valueConverter(event: LoxoneValueEvent | undefined): number {
    const pressureHpa = event?.value;
    if (pressureHpa === undefined || !Number.isFinite(pressureHpa)) return 0;
    return Math.round(Math.min(maxPressureHpa, Math.max(minPressureHpa, pressureHpa)));
  }

  static override typeNames(): string[] {
    return ['pressure'];
  }
}

export { PressureSensor };
