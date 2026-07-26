import { type MatterbridgeEndpoint, waterLeakDetector } from "matterbridge";
import type { LoxonePlatform } from "../LoxonePlatform.js";
import { BooleanState } from "matterbridge/matter/clusters";
import {
  ActiveOnlyStateNameKeys,
  ActiveOnlyStateNames,
  type ActiveOnlyStateNamesType,
  SingleDataPointSensor,
} from "./SingleDataPointSensor.js";
import type LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";
import { RegisterLoxoneDevice } from "./LoxoneDevice.js";
import { booleanValueConverter } from "../utils/Converters.js";

class WaterLeakSensor extends SingleDataPointSensor<ActiveOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      WaterLeakSensor.name,
      "water leak sensor",
      ActiveOnlyStateNameKeys[0],
      waterLeakDetector,
      BooleanState.id,
      "stateValue",
    );

    const latestValueEvent = this.getLatestValueEvent(ActiveOnlyStateNames.active);
    const initialValue = this.valueConverter(latestValueEvent);

    this.Endpoint =
      this.createDefaultEndpoint().createDefaultBooleanStateClusterServer(initialValue);
  }

  override valueConverter(event: LoxoneValueEvent | undefined): boolean {
    return booleanValueConverter(event);
  }

  static override typeNames(): string[] {
    return ["leak", "waterleak"];
  }
}

RegisterLoxoneDevice(WaterLeakSensor);

export { WaterLeakSensor };
