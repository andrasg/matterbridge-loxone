import {
  bridgedNode,
  powerSource,
  extendedColorLight,
  type MatterbridgeEndpoint,
  type CommandHandlerPayload,
} from "matterbridge";
import type { DeviceHost } from "./DeviceHost.js";
import { OnOff, LevelControl, ColorControl } from "matterbridge/matter/clusters";
import { LoxoneDevice } from "./LoxoneDevice.js";
import { LoxoneLevelInfo } from "../data/LoxoneLevelInfo.js";
import { MatterLevelInfo } from "../data/MatterLevelInfo.js";
import {
  ColorInfo,
  kelvinToMireds,
  miredsToKelvin,
  clamp,
  loxoneHueToMatter,
  loxoneSaturationToMatter,
  matterHueToLoxone,
  matterSaturationToLoxone,
} from "../data/ColorInfo.js";
import LoxoneTextEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js";
import type LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";

const STATE_NAMES = ["color"] as const;
type StateNameType = (typeof STATE_NAMES)[number];

const DEFAULT_MIN_KELVIN = 2700;
const DEFAULT_MAX_KELVIN = 6500;

/**
 * RGBW light backed by a Loxone `ColorPickerV2` subcontrol with `pickerType` `Rgb` or `Lumitech`.
 * Mapped to a Matter `extendedColorLight` (OnOff + LevelControl + HueSaturation + ColorTemperature).
 */
class RgbwLight extends LoxoneDevice<StateNameType> {
  public Endpoint: MatterbridgeEndpoint;

  private minKelvin: number;
  private maxKelvin: number;
  private minMireds: number;
  private maxMireds: number;

  private currentBrightness = 0;
  private lastNonZeroBrightness = 100;
  /** Loxone hue 0-360. */
  private currentHue = 0;
  /** Loxone saturation 0-100. */
  private currentSaturation = 0;
  private currentKelvin: number;

  constructor(control: Control, host: DeviceHost) {
    super(
      control,
      host,
      [extendedColorLight, bridgedNode, powerSource],
      STATE_NAMES,
      "rgbw light",
      `${RgbwLight.name}_${control.structureSection.uuidAction.replace(/[^a-zA-Z0-9]/g, "_")}`,
    );

    const range = RgbwLight.readKelvinRange(control);
    this.minKelvin = range.min;
    this.maxKelvin = range.max;
    this.minMireds = kelvinToMireds(this.maxKelvin);
    this.maxMireds = kelvinToMireds(this.minKelvin);
    this.currentKelvin = this.minKelvin;

    const info = ColorInfo.fromEvent(this.getLatestTextEvent("color"));
    if (info) {
      this.currentBrightness = info.brightness;
      if (info.brightness > 0) this.lastNonZeroBrightness = info.brightness;
      if (info.kind === "hsv") {
        this.currentHue = info.hue;
        this.currentSaturation = info.saturation;
      } else if (info.kind === "temp" && info.kelvin > 0) {
        this.currentKelvin = clamp(info.kelvin, this.minKelvin, this.maxKelvin);
      }
    }

    const level = new LoxoneLevelInfo(this.currentBrightness);
    const initialMireds = clamp(kelvinToMireds(this.currentKelvin), this.minMireds, this.maxMireds);

    this.Endpoint = this.createDefaultEndpoint()
      .createDefaultGroupsClusterServer()
      .createDefaultOnOffClusterServer(level.onOff)
      .createDefaultLevelControlClusterServer(level.matterLevel)
      .createHsColorControlClusterServer(
        loxoneHueToMatter(this.currentHue),
        loxoneSaturationToMatter(this.currentSaturation),
        initialMireds,
        this.minMireds,
        this.maxMireds,
      );

    this.addLoxoneCommandHandler("on", () => `setBrightness/${this.lastNonZeroBrightness}`);
    this.addLoxoneCommandHandler("off", () => "setBrightness/0");
    this.addLoxoneCommandHandler("moveToLevel", (data: CommandHandlerPayload<"moveToLevel">) => {
      const value = MatterLevelInfo.fromMatterNumber(data.request.level);
      return `setBrightness/${value.loxoneLevel}`;
    });
    this.addLoxoneCommandHandler(
      "moveToLevelWithOnOff",
      (data: CommandHandlerPayload<"moveToLevelWithOnOff">) => {
        const value = MatterLevelInfo.fromMatterNumber(data.request.level);
        return `setBrightness/${value.loxoneLevel}`;
      },
    );
    this.addLoxoneCommandHandler("moveToHue", (data: CommandHandlerPayload<"moveToHue">) => {
      this.currentHue = matterHueToLoxone(data.request.hue);
      return this.buildHsvCommand();
    });
    this.addLoxoneCommandHandler(
      "moveToSaturation",
      (data: CommandHandlerPayload<"moveToSaturation">) => {
        this.currentSaturation = matterSaturationToLoxone(data.request.saturation);
        return this.buildHsvCommand();
      },
    );
    this.addLoxoneCommandHandler(
      "moveToHueAndSaturation",
      (data: CommandHandlerPayload<"moveToHueAndSaturation">) => {
        this.currentHue = matterHueToLoxone(data.request.hue);
        this.currentSaturation = matterSaturationToLoxone(data.request.saturation);
        return this.buildHsvCommand();
      },
    );
    this.addLoxoneCommandHandler(
      "moveToColorTemperature",
      (data: CommandHandlerPayload<"moveToColorTemperature">) => {
        const kelvin = clamp(
          miredsToKelvin(data.request.colorTemperatureMireds),
          this.minKelvin,
          this.maxKelvin,
        );
        this.currentKelvin = kelvin;
        return `temp(${this.currentBrightness},${kelvin})`;
      },
    );
  }

  private buildHsvCommand(): string {
    return `hsv(${this.currentHue},${this.currentSaturation},${this.currentBrightness})`;
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void> {
    if (!(event instanceof LoxoneTextEvent)) return;

    await this.updateAttributesFromColorInfo(ColorInfo.fromEvent(event));
  }

  override async populateInitialState(): Promise<void> {
    await this.updateAttributesFromColorInfo(ColorInfo.fromEvent(this.getLatestTextEvent("color")));
  }

  private async updateAttributesFromColorInfo(info: ColorInfo | undefined): Promise<void> {
    if (!info) return;

    this.currentBrightness = info.brightness;
    if (info.brightness > 0) this.lastNonZeroBrightness = info.brightness;

    const level = new LoxoneLevelInfo(info.brightness);
    await this.Endpoint.updateAttribute(OnOff.id, "onOff", level.onOff, this.Endpoint.log);

    if (info.brightness > 0) {
      await this.Endpoint.updateAttribute(
        LevelControl.id,
        "currentLevel",
        level.matterLevel,
        this.Endpoint.log,
      );
    }

    if (info.kind === "hsv") {
      this.currentHue = info.hue;
      this.currentSaturation = info.saturation;
      await this.Endpoint.updateAttribute(
        ColorControl.id,
        "colorMode",
        ColorControl.ColorMode.CurrentHueAndCurrentSaturation,
        this.Endpoint.log,
      );
      await this.Endpoint.updateAttribute(
        ColorControl.id,
        "currentHue",
        loxoneHueToMatter(info.hue),
        this.Endpoint.log,
      );
      await this.Endpoint.updateAttribute(
        ColorControl.id,
        "currentSaturation",
        loxoneSaturationToMatter(info.saturation),
        this.Endpoint.log,
      );
    } else if (info.kind === "temp" && info.kelvin > 0) {
      this.currentKelvin = clamp(info.kelvin, this.minKelvin, this.maxKelvin);
      const mireds = clamp(kelvinToMireds(this.currentKelvin), this.minMireds, this.maxMireds);
      await this.Endpoint.updateAttribute(
        ColorControl.id,
        "colorMode",
        ColorControl.ColorMode.ColorTemperatureMireds,
        this.Endpoint.log,
      );
      await this.Endpoint.updateAttribute(
        ColorControl.id,
        "colorTemperatureMireds",
        mireds,
        this.Endpoint.log,
      );
    }
  }

  private static readKelvinRange(control: Control): { min: number; max: number } {
    const details = control.structureSection?.details ?? {};
    const minRaw = Number(details.TWMin ?? details.minKelvin);
    const maxRaw = Number(details.TWMax ?? details.maxKelvin);
    const min = Number.isFinite(minRaw) && minRaw > 0 ? minRaw : DEFAULT_MIN_KELVIN;
    const max = Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : DEFAULT_MAX_KELVIN;
    return min <= max ? { min, max } : { min: max, max: min };
  }

  static override typeNames(): string[] {
    return ["rgbw"];
  }
}

export { RgbwLight };
