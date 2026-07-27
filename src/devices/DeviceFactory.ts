import type Control from "loxone-ts-api/dist/Structure/Control.js";
import type { DeviceHost } from "./DeviceHost.js";
import type { AdditionalConfig, LoxoneDevice } from "./LoxoneDevice.js";
import { AirConditioner } from "./AirConditioner.js";
import { CoAlarm } from "./CoAlarm.js";
import { ContactSensor } from "./ContactSensor.js";
import { DimmerLight } from "./DimmerLight.js";
import { HumiditySensor } from "./HumiditySensor.js";
import { createLightOutputDevice } from "./LightOutput.js";
import { LightMood } from "./LightMood.js";
import { LightSensor } from "./LightSensor.js";
import { MotionSensor } from "./MotionSensor.js";
import { OnOffButton } from "./OnOffButton.js";
import { OnOffLight } from "./OnOffLight.js";
import { OnOffOutlet } from "./OnOffOutlet.js";
import { OnOffSwitch } from "./OnOffSwitch.js";
import { PressureSensor } from "./PressureSensor.js";
import { PushButton } from "./PushButton.js";
import { RadioButton } from "./RadioButton.js";
import { RgbwLight } from "./RgbwLight.js";
import { SmokeAlarm } from "./SmokeAlarm.js";
import { TemperatureSensor } from "./TemperatureSensor.js";
import { TunableWhiteLight } from "./TunableWhiteLight.js";
import { WaterLeakSensor } from "./WaterLeakSensor.js";
import { WindowShade } from "./WindowShade.js";

/** Creates a device for a Loxone control. */
export type LoxoneDeviceFactory = (
  control: Control,
  host: DeviceHost,
  additionalConfig: AdditionalConfig,
) => LoxoneDevice;

/** A concrete `LoxoneDevice` subclass that declares the config type names it handles. */
interface LoxoneDeviceConstructor {
  new (control: Control, host: DeviceHost, additionalConfig: AdditionalConfig): LoxoneDevice;
  typeNames(): string[];
}

/**
 * All concrete device classes, keyed at build time by the type names they declare.
 *
 * This is an explicit table rather than module-evaluation side effects, so registration is
 * deterministic, order independent and testable without starting the platform. Adding a device
 * means adding it here.
 */
const deviceConstructors: readonly LoxoneDeviceConstructor[] = [
  AirConditioner,
  CoAlarm,
  ContactSensor,
  DimmerLight,
  HumiditySensor,
  LightMood,
  LightSensor,
  MotionSensor,
  OnOffButton,
  OnOffLight,
  OnOffOutlet,
  OnOffSwitch,
  PressureSensor,
  PushButton,
  RadioButton,
  RgbwLight,
  SmokeAlarm,
  TemperatureSensor,
  TunableWhiteLight,
  WaterLeakSensor,
  WindowShade,
];

/** Factories that are not a plain constructor because they resolve the device type at runtime. */
const additionalFactories: readonly (readonly [string, LoxoneDeviceFactory])[] = [
  ["lightoutput", createLightOutputDevice],
];

/**
 * Builds the lookup table of device factories keyed by lower-cased config type name.
 *
 * Edge cases:
 *  - A device class declaring no type names is a programming error and throws.
 *  - Two device classes declaring the same type name is a programming error and throws, rather
 *    than silently overwriting one registration as the previous self-registration did.
 *
 * @returns {ReadonlyMap<string, LoxoneDeviceFactory>} The device factories by lower-cased type name.
 */
function buildDeviceFactories(): ReadonlyMap<string, LoxoneDeviceFactory> {
  const factories = new Map<string, LoxoneDeviceFactory>();

  for (const deviceConstructor of deviceConstructors) {
    const typeNames = deviceConstructor.typeNames();
    if (typeNames.length === 0) {
      throw new Error(`Device class ${deviceConstructor.name} declares no type names`);
    }

    for (const typeName of typeNames) {
      const key = typeName.toLowerCase();
      if (factories.has(key)) {
        throw new Error(
          `Device type name '${typeName}' from ${deviceConstructor.name} is already registered`,
        );
      }
      factories.set(
        key,
        (control, host, additionalConfig) => new deviceConstructor(control, host, additionalConfig),
      );
    }
  }

  for (const [typeName, factory] of additionalFactories) {
    if (factories.has(typeName)) {
      throw new Error(`Device type name '${typeName}' is already registered`);
    }
    factories.set(typeName, factory);
  }

  return factories;
}

/** Device factories by lower-cased config type name. */
export const deviceFactories: ReadonlyMap<string, LoxoneDeviceFactory> = buildDeviceFactories();
