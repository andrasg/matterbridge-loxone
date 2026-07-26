import { type MatterbridgeEndpoint, occupancySensor } from "matterbridge";
import type { LoxonePlatform } from "../LoxonePlatform.js";
import { OccupancySensing } from "matterbridge/matter/clusters";
import {
  ActiveOnlyStateNameKeys,
  ActiveOnlyStateNames,
  type ActiveOnlyStateNamesType,
  SingleDataPointSensor,
} from "./SingleDataPointSensor.js";
import type LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";
import { RegisterLoxoneDevice } from "./LoxoneDevice.js";

class MotionSensor extends SingleDataPointSensor<ActiveOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      MotionSensor.name,
      "motion sensor",
      ActiveOnlyStateNameKeys[0],
      occupancySensor,
      OccupancySensing.id,
      "occupancy",
    );

    const latestValueEvent = this.getLatestValueEvent(ActiveOnlyStateNames.active);
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

RegisterLoxoneDevice(MotionSensor);

export { MotionSensor };
