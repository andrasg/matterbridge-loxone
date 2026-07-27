import { onOffLightSwitch } from "matterbridge";
import type { DeviceHost } from "./DeviceHost.js";
import { OnOffDevice } from "./OnOffDevice.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";

class OnOffSwitch extends OnOffDevice {
  constructor(control: Control, host: DeviceHost) {
    super(control, host, OnOffSwitch.name, "switch", onOffLightSwitch);
  }

  static override typeNames(): string[] {
    return ["switch"];
  }
}

export { OnOffSwitch };
