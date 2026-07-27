import { type MatterbridgeEndpoint, occupancySensor } from "matterbridge";
import type { DeviceHost } from "./DeviceHost.js";
import { OccupancySensing } from "matterbridge/matter/clusters";
import { type ActiveOnlyStateNamesType, SingleDataPointSensor } from "./SingleDataPointSensor.js";
import type LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";

class MotionSensor extends SingleDataPointSensor<ActiveOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, host: DeviceHost) {
    super(
      control,
      host,
      MotionSensor.name,
      "motion sensor",
      "active",
      occupancySensor,
      OccupancySensing.id,
      "occupancy",
    );

    const latestValueEvent = this.getLatestValueEvent("active");
    const initialValue = this.valueConverter(latestValueEvent).occupied;

    this.Endpoint =
      this.createDefaultEndpoint().createDefaultOccupancySensingClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueEvent | undefined): { occupied: boolean } {
    return event ? { occupied: event.value === 1 } : { occupied: false };
  }

  static override typeNames(): string[] {
    return ["motion", "presence", "occupancy"];
  }
}

export { MotionSensor };
