import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import type Control from 'loxone-ts-api/dist/Structure/Control.js';
import { bridgedNode, powerSource, colorTemperatureLight, type MatterbridgeEndpoint } from 'matterbridge';
import { OnOff, LevelControl, ColorControl } from 'matterbridge/matter/clusters';

import { ColorInfo, kelvinToMireds, miredsToKelvin, clamp } from '../data/ColorInfo.js';
import { LoxoneLevelInfo } from '../data/LoxoneLevelInfo.js';
import { MatterLevelInfo } from '../data/MatterLevelInfo.js';
import type { DeviceHost } from './DeviceHost.js';
import { LightCommandBridge } from './LightCommandBridge.js';
import { LoxoneDevice } from './LoxoneDevice.js';

const STATE_NAMES = ['color'] as const;
type StateNameType = (typeof STATE_NAMES)[number] | 'sequenceColorIdx';

const DEFAULT_MIN_KELVIN = 2700;
const DEFAULT_MAX_KELVIN = 6500;

/**
 * Tunable-white light backed by a Loxone `ColorPickerV2` subcontrol with `pickerType` `TunableWhite`.
 * Mapped to a Matter `colorTemperatureLight` (OnOff + LevelControl + ColorTemperature).
 */
class TunableWhiteLight extends LoxoneDevice<StateNameType> {
  public Endpoint: MatterbridgeEndpoint;
  private readonly lightCommands: LightCommandBridge;
  private isSequenceActive = false;

  private minKelvin: number;
  private maxKelvin: number;
  private minMireds: number;
  private maxMireds: number;

  private currentBrightness = 0;
  private currentKelvin: number;

  constructor(control: Control, host: DeviceHost) {
    super(
      control,
      host,
      [colorTemperatureLight, bridgedNode, powerSource],
      STATE_NAMES,
      'tunable white light',
      `${TunableWhiteLight.name}_${control.structureSection.uuidAction.replace(/[^a-zA-Z0-9]/g, '_')}`,
    );

    const sequenceState = control.statesByName.get('sequenceColorIdx');
    if (sequenceState) {
      this.statesByName.set('sequenceColorIdx', sequenceState);
      this.updateSequenceState(sequenceState.latestEvent);
    }

    const range = TunableWhiteLight.readKelvinRange(control);
    this.minKelvin = range.min;
    this.maxKelvin = range.max;
    this.minMireds = kelvinToMireds(this.maxKelvin);
    this.maxMireds = kelvinToMireds(this.minKelvin);
    this.currentKelvin = this.minKelvin;

    const info = ColorInfo.fromEvent(this.getLatestTextEvent('color'));
    if (info) {
      this.currentBrightness = info.brightness;
      if (info.kind === 'temp' && info.kelvin > 0) this.currentKelvin = clamp(info.kelvin, this.minKelvin, this.maxKelvin);
    }

    const level = new LoxoneLevelInfo(this.currentBrightness);
    const initialMireds = clamp(kelvinToMireds(this.currentKelvin), this.minMireds, this.maxMireds);

    this.Endpoint = this.createDefaultEndpoint()
      .createDefaultGroupsClusterServer()
      .createDefaultOnOffClusterServer(level.onOff)
      .createDefaultLevelControlClusterServer(level.onOff ? level.matterLevel : 254)
      .createCtColorControlClusterServer(initialMireds, this.minMireds, this.maxMireds);

    this.lightCommands = new LightCommandBridge(
      this.Endpoint,
      (colorState) => {
        const level = this.Endpoint.getAttribute(LevelControl, 'currentLevel') ?? 254;
        const brightness = this.Endpoint.getAttribute(OnOff, 'onOff') ? Math.max(1, MatterLevelInfo.fromMatterNumber(level).loxoneLevel) : 0;
        if (this.isSequenceActive && !colorState) return `setBrightness/${brightness}`;
        const mireds = colorState?.colorTemperatureMireds ?? this.Endpoint.getAttribute(ColorControl, 'colorTemperatureMireds') ?? this.minMireds;
        const kelvin = clamp(miredsToKelvin(mireds), this.minKelvin, this.maxKelvin);
        return `temp(${brightness},${kelvin})`;
      },
      async (command) => await this.host.sendControlCommand(this.control.uuidAction, command),
    );
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void> {
    if (this.stateNameOf(event) === 'sequenceColorIdx') {
      this.updateSequenceState(event);
      return;
    }
    if (this.stateNameOf(event) !== 'color' || !(event instanceof LoxoneTextEvent)) return;

    await this.lightCommands.updateFromLoxone(async () => await this.updateAttributesFromColorInfo(ColorInfo.fromEvent(event)));
  }

  override async populateInitialState(): Promise<void> {
    this.updateSequenceState(this.statesByName.get('sequenceColorIdx')?.latestEvent);
    await this.lightCommands.updateFromLoxone(async () => await this.updateAttributesFromColorInfo(ColorInfo.fromEvent(this.getLatestTextEvent('color'))));
  }

  private updateSequenceState(event: unknown): void {
    this.isSequenceActive = event instanceof LoxoneValueEvent && Number.isInteger(event.value) && event.value >= 0;
  }

  private async updateAttributesFromColorInfo(info: ColorInfo | undefined): Promise<void> {
    if (!info) return;

    this.currentBrightness = info.brightness;

    const level = new LoxoneLevelInfo(info.brightness);
    await this.Endpoint.updateAttribute(OnOff.id, 'onOff', level.onOff, this.Endpoint.log);

    if (info.brightness > 0) {
      await this.Endpoint.updateAttribute(LevelControl.id, 'currentLevel', level.matterLevel, this.Endpoint.log);
    }

    if (info.kind === 'temp' && info.kelvin > 0) {
      this.currentKelvin = clamp(info.kelvin, this.minKelvin, this.maxKelvin);
      const mireds = clamp(kelvinToMireds(this.currentKelvin), this.minMireds, this.maxMireds);
      await this.Endpoint.updateAttribute(ColorControl.id, 'colorMode', ColorControl.ColorMode.ColorTemperatureMireds, this.Endpoint.log);
      await this.Endpoint.updateAttribute(ColorControl.id, 'colorTemperatureMireds', mireds, this.Endpoint.log);
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
    return ['tunableWhite'];
  }
}

export { TunableWhiteLight };
