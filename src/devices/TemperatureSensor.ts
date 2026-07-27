import { type MatterbridgeEndpoint, temperatureSensor } from "matterbridge";
import type { DeviceHost } from "./DeviceHost.js";
import { TemperatureMeasurement } from "matterbridge/matter/clusters";
import { SingleDataPointSensor, type ValueOnlyStateNamesType } from "./SingleDataPointSensor.js";
import type LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";
import { numberValueConverter } from "../utils/Converters.js";

class TemperatureSensor extends SingleDataPointSensor<ValueOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, host: DeviceHost) {
    super(
      control,
      host,
      TemperatureSensor.name,
      "temperature sensor",
      "value",
      temperatureSensor,
      TemperatureMeasurement.id,
      "measuredValue",
    );
    const latestValueEvent = this.getLatestValueEvent("value");
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint =
      this.createDefaultEndpoint().createDefaultTemperatureMeasurementClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueEvent | undefined): number {
    return numberValueConverter(event);
  }

  static override typeNames(): string[] {
    return ["temperature"];
  }
}

export { TemperatureSensor };
