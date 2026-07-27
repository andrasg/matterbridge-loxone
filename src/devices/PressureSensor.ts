import { type MatterbridgeEndpoint, pressureSensor } from "matterbridge";
import type { DeviceHost } from "./DeviceHost.js";
import { PressureMeasurement } from "matterbridge/matter/clusters";
import { type ActiveOnlyStateNamesType, SingleDataPointSensor } from "./SingleDataPointSensor.js";
import type LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";

class PressureSensor extends SingleDataPointSensor<ActiveOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, host: DeviceHost) {
    super(
      control,
      host,
      PressureSensor.name,
      "pressure sensor",
      "active",
      pressureSensor,
      PressureMeasurement.id,
      "measuredValue",
    );

    const latestValueEvent = this.getLatestValueEvent("active");
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

export { PressureSensor };
