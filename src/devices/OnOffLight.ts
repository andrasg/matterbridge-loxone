import { onOffLight } from "matterbridge";
import type { DeviceHost } from "./DeviceHost.js";
import { OnOffDevice } from "./OnOffDevice.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";

class OnOffLight extends OnOffDevice {
  constructor(control: Control, host: DeviceHost) {
    super(control, host, OnOffLight.name, "light", onOffLight);
  }

  static override typeNames(): string[] {
    return ["light"];
  }
}

export { OnOffLight };
