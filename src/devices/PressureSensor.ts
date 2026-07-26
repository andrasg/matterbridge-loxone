import { type MatterbridgeEndpoint, pressureSensor } from "matterbridge";
import type { LoxonePlatform } from "../LoxonePlatform.js";
import { PressureMeasurement } from "matterbridge/matter/clusters";
import {
  ActiveOnlyStateNameKeys,
  ActiveOnlyStateNames,
  type ActiveOnlyStateNamesType,
  SingleDataPointSensor,
} from "./SingleDataPointSensor.js";
import type LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";
import { RegisterLoxoneDevice } from "./LoxoneDevice.js";

class PressureSensor extends SingleDataPointSensor<ActiveOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      PressureSensor.name,
      "pressure sensor",
      ActiveOnlyStateNameKeys[0],
      pressureSensor,
      PressureMeasurement.id,
      "measuredValue",
    );

    const latestValueEvent = this.getLatestValueEvent(ActiveOnlyStateNames.active);
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint =
      this.createDefaultEndpoint().createDefaultPressureMeasurementClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueEvent | undefined): number {
    return event ? event.value : 0;
  }

  static override typeNames(): string[] {
    return ["pressure"];
  }
}

RegisterLoxoneDevice(PressureSensor);

export { PressureSensor };
