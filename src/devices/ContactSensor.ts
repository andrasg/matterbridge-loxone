import { contactSensor, type MatterbridgeEndpoint } from "matterbridge";
import type { LoxonePlatform } from "../LoxonePlatform.js";
import { BooleanState } from "matterbridge/matter/clusters";
import {
  ActiveOnlyStateNames,
  type ActiveOnlyStateNamesType,
  ActiveOnlyStateNameKeys,
  SingleDataPointSensor,
} from "./SingleDataPointSensor.js";
import type LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";
import { RegisterLoxoneDevice } from "./LoxoneDevice.js";
import { booleanValueConverter } from "../utils/Converters.js";

class ContactSensor extends SingleDataPointSensor<ActiveOnlyStateNamesType> {
  public Endpoint: MatterbridgeEndpoint;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      ContactSensor.name,
      "contact sensor",
      ActiveOnlyStateNameKeys[0],
      contactSensor,
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
    return ["contactsensor", "contact"];
  }
}

// register device with the registry
RegisterLoxoneDevice(ContactSensor);

export { ContactSensor };
