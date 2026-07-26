import { onOffLight } from "matterbridge";
import type { LoxonePlatform } from "../LoxonePlatform.js";
import { OnOffDevice } from "./OnOffDevice.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";
import { RegisterLoxoneDevice } from "./LoxoneDevice.js";

class OnOffLight extends OnOffDevice {
  constructor(control: Control, platform: LoxonePlatform) {
    super(control, platform, OnOffLight.name, "light", onOffLight);
  }

  static override typeNames(): string[] {
    return ["light"];
  }
}

RegisterLoxoneDevice(OnOffLight);

export { OnOffLight };
