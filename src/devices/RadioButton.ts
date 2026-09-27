import type LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import type Control from 'loxone-ts-api/dist/Structure/Control.js';
import { bridgedNode, powerSource, onOffLightSwitch, type MatterbridgeEndpoint } from 'matterbridge';
import { OnOff } from 'matterbridge/matter/clusters';

import type { DeviceHost } from './DeviceHost.js';
import { type AdditionalConfig, LoxoneDevice } from './LoxoneDevice.js';

const STATE_NAMES = ['activeOutput'] as const;
type StateNameType = (typeof STATE_NAMES)[number];

interface RadioCommandState {
  activeOutput: number;
  latestEvent: LoxoneValueEvent;
  tail: Promise<null>;
}

class RadioButton extends LoxoneDevice<StateNameType> {
  private static readonly commandStates = new WeakMap<Control, RadioCommandState>();
  private readonly commandState: RadioCommandState;
  public Endpoint: MatterbridgeEndpoint;
  outputId: number;
  outputName: string;

  constructor(control: Control, host: DeviceHost, additionalConfig: AdditionalConfig) {
    super(
      control,
      host,
      [onOffLightSwitch, bridgedNode, powerSource],
      STATE_NAMES,
      'radio button',
      `${RadioButton.name}_${control.structureSection.uuidAction.replace(/-/g, '_')}_${additionalConfig.outputId}`,
    );

    if (!additionalConfig?.outputId || (additionalConfig.outputId !== 'allOff' && !/^(?:0|[1-9]|1[0-6])$/.test(additionalConfig.outputId))) {
      throw new Error(`RadioButton device requires outputId 1-16 or allOff.`);
    }

    this.outputId = additionalConfig.outputId === 'allOff' ? 0 : Number.parseInt(additionalConfig.outputId);
    this.outputName = this.getOutputName();

    this.setNameSuffix(this.outputName);

    const latestActiveOutputEvent = this.getLatestValueEvent('activeOutput');
    const initialValue = latestActiveOutputEvent.value === this.outputId;
    this.commandState = RadioButton.commandStates.get(control) ?? {
      activeOutput: latestActiveOutputEvent.value,
      latestEvent: latestActiveOutputEvent,
      tail: Promise.resolve(null),
    };
    RadioButton.commandStates.set(control, this.commandState);

    this.Endpoint = this.createDefaultEndpoint().createDefaultGroupsClusterServer().createDefaultOnOffClusterServer(initialValue);

    this.Endpoint.addCommandHandler('on', async () => {
      await this.setOutput(true);
    });
    this.Endpoint.addCommandHandler('off', async () => {
      await this.setOutput(false);
    });
  }

  /**
   * Serialize output requests across endpoints of the same Radio control.
   * Retain the last sent selection until newer feedback is available.
   *
   * @param {boolean} on Whether to select this output or deselect it if active.
   * @returns {Promise<void>} Resolves after sending the command or skipping an inactive output.
   */
  private async setOutput(on: boolean): Promise<void> {
    const state = this.commandState;
    const previous = state.tail;
    const completion = Promise.withResolvers<null>();
    state.tail = completion.promise;
    await previous;
    try {
      const latestEvent = this.getLatestValueEvent('activeOutput');
      if (latestEvent !== state.latestEvent) {
        state.activeOutput = latestEvent.value;
        state.latestEvent = latestEvent;
      }

      if (!on) {
        if (state.activeOutput !== this.outputId) return;
        if (this.outputId === 0) {
          throw new Error('Cannot turn off allOff; select a Radio output instead.');
        }
      }

      const targetOutput = on ? this.outputId : 0;
      const command = targetOutput === 0 ? 'reset' : `${targetOutput}`;
      this.Endpoint.log.info(`Calling Loxone API command '${command}'`);
      await this.host.sendControlCommand(this.control.structureSection.uuidAction, command);
      state.activeOutput = targetOutput;
      state.latestEvent = this.getLatestValueEvent('activeOutput');
    } finally {
      completion.resolve(null);
    }
  }

  private getOutputName(): string {
    if (this.outputId === 0) {
      const name = this.control.structureSection.details.allOff;
      if (typeof name !== 'string' || name.trim() === '') {
        throw new Error(`Control ${this.control.name} does not support allOff.`);
      }
      return name;
    } else {
      const output = this.control.structureSection.details.outputs[this.outputId];
      if (!output) {
        throw new Error(`Could not find output ${this.outputId} for control ${this.control.name}`);
      }
      return output;
    }
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void> {
    if (!(event instanceof LoxoneValueEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState(): Promise<void> {
    const latestActiveOutputEvent = this.getLatestValueEvent('activeOutput');
    await this.updateAttributesFromLoxoneEvent(latestActiveOutputEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent): Promise<void> {
    await this.Endpoint.updateAttribute(OnOff.id, 'onOff', event.value === this.outputId, this.Endpoint.log);
  }

  static override typeNames(): string[] {
    return ['radio', 'radiobutton'];
  }
}

export { RadioButton };
