import { humiditySensor, type MatterbridgeEndpoint } from "matterbridge";
import type { LoxonePlatform } from "../LoxonePlatform.js";
import { RelativeHumidityMeasurement } from "matterbridge/matter/clusters";
import {
  SingleDataPointSensor,
  type ValueOnlyStateNamesType,
  ValueOnlyStateNameKeys,
} from "./SingleDataPointSensor.js";
import type LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";
import { RegisterLoxoneDevice } from "./LoxoneDevice.js";
import * as Converters from "../utils/Converters.js";

class HumiditySensor extends SingleDataPointSensor<ValueOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      HumiditySensor.name,
      "humidity sensor",
      ValueOnlyStateNameKeys[0],
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
    return Converters.numberValueConverter(event);
  }

  static override typeNames(): string[] {
    return ["humidity"];
  }
}

// register device with the registry
RegisterLoxoneDevice(HumiditySensor);

export { HumiditySensor };
