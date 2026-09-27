import type { MatterbridgeEndpoint } from 'matterbridge';
import { ColorControl, LevelControl, OnOff } from 'matterbridge/matter/clusters';

/** Captures the colour values belonging to a pending Matter request, independently of device feedback. */
export interface LightColorState {
  colorMode: number | undefined;
  colorTemperatureMireds: number | undefined;
  currentHue: number | undefined;
  currentSaturation: number | undefined;
}

/** Forwards accepted light state changes, including managed transitions, to Loxone. */
export class LightCommandBridge {
  private feedbackDepth = 0;
  private scheduled = false;
  private sending = false;
  private pendingCommand: string | undefined;
  private pendingColorState: LightColorState | undefined;

  /**
   * Subscribes to the light's supported state attributes.
   * @param {MatterbridgeEndpoint} endpoint The light endpoint.
   * @param {function} formatCommand Formats the current light state with an optional snapshot of an unsent colour change.
   * @param {function} sendCommand Sends one command to the Loxone output.
   */
  constructor(
    private readonly endpoint: MatterbridgeEndpoint,
    private readonly formatCommand: (colorState: Readonly<LightColorState> | undefined) => string,
    private readonly sendCommand: (command: string) => Promise<void>,
  ) {
    const changed = (): void => {
      if (this.feedbackDepth > 0) return;
      if (this.scheduled) return;
      this.scheduled = true;
      queueMicrotask(() => {
        this.scheduled = false;
        this.pendingCommand = this.formatCommand(this.pendingColorState);
        void this.flush();
      });
    };

    const colorChanged = (attribute: keyof LightColorState, value: number | undefined): void => {
      if (this.feedbackDepth > 0) return;
      this.pendingColorState ??= {
        colorMode: endpoint.getAttribute(ColorControl, 'colorMode'),
        colorTemperatureMireds: endpoint.getAttribute(ColorControl, 'colorTemperatureMireds'),
        currentHue: endpoint.hasAttributeServer(ColorControl, 'currentHue') ? endpoint.getAttribute(ColorControl, 'currentHue') : undefined,
        currentSaturation: endpoint.hasAttributeServer(ColorControl, 'currentSaturation') ? endpoint.getAttribute(ColorControl, 'currentSaturation') : undefined,
      };
      this.pendingColorState[attribute] = value;
      changed();
    };

    endpoint.subscribeAttribute(OnOff, 'onOff', () => changed());
    if (endpoint.hasClusterServer(LevelControl)) {
      endpoint.behaviors.require(endpoint.behaviors.supported.levelControl, {
        managedTransitionTimeHandling: true,
      });
      endpoint.subscribeAttribute(LevelControl, 'currentLevel', () => changed());
    }
    if (endpoint.hasClusterServer(ColorControl)) {
      endpoint.behaviors.require(endpoint.behaviors.supported.colorControl, {
        managedTransitionTimeHandling: true,
      });
      endpoint.subscribeAttribute(ColorControl, 'colorMode', (value) => colorChanged('colorMode', value));
      endpoint.subscribeAttribute(ColorControl, 'colorTemperatureMireds', (value) => colorChanged('colorTemperatureMireds', value));
      if (endpoint.hasAttributeServer(ColorControl, 'currentHue')) {
        endpoint.subscribeAttribute(ColorControl, 'currentHue', (value) => colorChanged('currentHue', value));
        endpoint.subscribeAttribute(ColorControl, 'currentSaturation', (value) => colorChanged('currentSaturation', value));
      }
    }
  }

  /**
   * Applies device feedback without forwarding it back to Loxone.
   * @param {function} update Updates Matter attributes from a Loxone event.
   * @returns {Promise<void>} Resolves when the feedback has been applied.
   */
  async updateFromLoxone(update: () => Promise<void>): Promise<void> {
    this.feedbackDepth++;
    try {
      await update();
    } finally {
      this.feedbackDepth--;
    }
  }

  private async flush(): Promise<void> {
    if (this.sending) return;
    this.sending = true;
    try {
      while (this.pendingCommand !== undefined && !this.scheduled) {
        const command = this.pendingCommand;
        this.pendingCommand = undefined;
        this.pendingColorState = undefined;
        try {
          await this.sendCommand(command);
        } catch (error: unknown) {
          this.endpoint.log.error(`Error calling Loxone API command: ${String(error)}`);
        }
      }
    } finally {
      this.sending = false;
    }
  }
}
