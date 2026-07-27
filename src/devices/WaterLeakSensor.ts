import { type MatterbridgeEndpoint, waterLeakDetector } from "matterbridge";
import type { DeviceHost } from "./DeviceHost.js";
import { BooleanState } from "matterbridge/matter/clusters";
import { type ActiveOnlyStateNamesType, SingleDataPointSensor } from "./SingleDataPointSensor.js";
import type LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";
import { booleanValueConverter } from "../utils/Converters.js";

class WaterLeakSensor extends SingleDataPointSensor<ActiveOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, host: DeviceHost) {
    super(
      control,
      host,
      WaterLeakSensor.name,
      "water leak sensor",
      "active",
      waterLeakDetector,
      BooleanState.id,
      "stateValue",
    );

    const latestValueEvent = this.getLatestValueEvent("active");
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

export { WaterLeakSensor };
