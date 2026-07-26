import { onOffOutlet } from "matterbridge";
import type { LoxonePlatform } from "../LoxonePlatform.js";
import { OnOffDevice } from "./OnOffDevice.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";
import { RegisterLoxoneDevice } from "./LoxoneDevice.js";

class OnOffOutlet extends OnOffDevice {
  constructor(control: Control, platform: LoxonePlatform) {
    super(control, platform, OnOffOutlet.name, "outlet", onOffOutlet);
  }

  static override typeNames(): string[] {
    return ["outlet", "socket", "plug"];
  }
}

RegisterLoxoneDevice(OnOffOutlet);

export { OnOffOutlet };
