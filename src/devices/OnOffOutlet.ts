import { onOffPlugInUnit } from "matterbridge";
import type { DeviceHost } from "./DeviceHost.js";
import { OnOffDevice } from "./OnOffDevice.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";

class OnOffOutlet extends OnOffDevice {
  constructor(control: Control, host: DeviceHost) {
    super(control, host, OnOffOutlet.name, "outlet", onOffPlugInUnit);
  }

  static override typeNames(): string[] {
    return ["outlet", "socket", "plug"];
  }
}

export { OnOffOutlet };
