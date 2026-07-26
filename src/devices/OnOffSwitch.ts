import { onOffLightSwitch } from "matterbridge";
import type { LoxonePlatform } from "../LoxonePlatform.js";
import { OnOffDevice } from "./OnOffDevice.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";
import { RegisterLoxoneDevice } from "./LoxoneDevice.js";

class OnOffSwitch extends OnOffDevice {
  constructor(control: Control, platform: LoxonePlatform) {
    super(control, platform, OnOffSwitch.name, "switch", onOffLightSwitch);
  }

  static override typeNames(): string[] {
    return ["switch"];
  }
}

RegisterLoxoneDevice(OnOffSwitch);

export { OnOffSwitch };
