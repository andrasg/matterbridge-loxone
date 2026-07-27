import { humiditySensor, type MatterbridgeEndpoint } from "matterbridge";
import type { DeviceHost } from "./DeviceHost.js";
import { RelativeHumidityMeasurement } from "matterbridge/matter/clusters";
import { SingleDataPointSensor, type ValueOnlyStateNamesType } from "./SingleDataPointSensor.js";
import type LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";
import { numberValueConverter } from "../utils/Converters.js";

class HumiditySensor extends SingleDataPointSensor<ValueOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, host: DeviceHost) {
    super(
      control,
      host,
      HumiditySensor.name,
      "humidity sensor",
      "value",
      humiditySensor,
      RelativeHumidityMeasurement.id,
      "measuredValue",
    );

    const latestValueEvent = this.getLatestValueEvent(this.singleStateName);
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint =
      this.createDefaultEndpoint().createDefaultRelativeHumidityMeasurementClusterServer(
        initialValue,
      );
  }

  override valueConverter(event: LoxoneValueEvent | undefined): number {
    return numberValueConverter(event);
  }

  static override typeNames(): string[] {
    return ["humidity"];
  }
}

export { HumiditySensor };
