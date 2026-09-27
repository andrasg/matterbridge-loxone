import type LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import type Control from 'loxone-ts-api/dist/Structure/Control.js';
import { bridgedNode, powerSource, windowCovering, type MatterbridgeEndpoint, type CommandHandlerPayload } from 'matterbridge';
import { WindowCovering } from 'matterbridge/matter/clusters';

import type { DeviceHost } from './DeviceHost.js';
import { LoxoneDevice } from './LoxoneDevice.js';

const STATE_NAMES = ['up', 'down', 'position', 'targetPosition'] as const;
type StateNameType = (typeof STATE_NAMES)[number];

class WindowShade extends LoxoneDevice<StateNameType> {
  public Endpoint: MatterbridgeEndpoint;

  private isMovingUp: boolean;
  private isMovingDown: boolean;
  private currentPosition = 0;
  private targetPosition = 0;
  private updatePending = false;

  constructor(control: Control, host: DeviceHost) {
    super(
      control,
      host,
      [windowCovering, bridgedNode, powerSource],
      STATE_NAMES,
      'window covering',
      `${WindowShade.name}_${control.structureSection.uuidAction.replace(/-/g, '_')}`,
    );

    const latestValueEvent = this.getLatestValueEvent('position');
    this.currentPosition = latestValueEvent ? latestValueEvent.value * 10000 : 0;
    this.isMovingUp = this.getLatestValueEvent('up').value === 1;
    this.isMovingDown = this.getLatestValueEvent('down').value === 1;

    this.Endpoint = this.createDefaultEndpoint().createDefaultWindowCoveringClusterServer(this.currentPosition);

    this.addLoxoneCommandHandler('stopMotion', () => {
      return 'stop';
    });
    this.addLoxoneCommandHandler('downOrClose', () => {
      return 'FullDown';
    });
    this.addLoxoneCommandHandler('upOrOpen', () => {
      return 'FullUp';
    });
    this.addLoxoneCommandHandler('goToLiftPercentage', (data: CommandHandlerPayload<'goToLiftPercentage'>) => {
      const targetNumber = Math.round(data.request.liftPercent100thsValue / 100);
      let loxoneCommand;
      if (targetNumber < 1) {
        loxoneCommand = 'FullUp';
      } else if (targetNumber > 99) {
        loxoneCommand = 'FullDown';
      } else {
        loxoneCommand = `manualPosition/${targetNumber}`;
      }
      return loxoneCommand;
    });
  }

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void> {
    if (!(event instanceof LoxoneValueEvent)) return;

    switch (this.stateNameOf(event)) {
      case 'up':
        this.handleUpwardMovement(event);
        break;
      case 'down':
        this.handleDownwardMovement(event);
        break;
      case 'position':
        await this.handlePositionUpdate(event);
        break;
      case 'targetPosition':
        this.handleTargetPositionUpdate(event);
        break;
      default:
        this.Endpoint.log.warn(`Unhandled event: ${event.state?.name}`);
    }
  }

  private handleTargetPositionUpdate(event: LoxoneValueEvent): void {
    this.targetPosition = event.value * 10000;
    this.Endpoint.log.info(`Target position: ${this.targetPosition}`);
    // not updating Matter status, as it will be updated by the up/down event;
  }

  private async handlePositionUpdate(event: LoxoneValueEvent): Promise<void> {
    this.currentPosition = event.value * 10000;
    this.Endpoint.log.info(`Current position: ${this.currentPosition}`);
    await this.Endpoint.updateAttribute(WindowCovering.id, 'currentPositionLiftPercent100ths', this.currentPosition, this.Endpoint.log);
  }

  private handleDownwardMovement(event: LoxoneValueEvent): void {
    this.isMovingDown = event.value === 1;
    this.handleMovementActionWithDelay();
  }

  private handleUpwardMovement(event: LoxoneValueEvent): void {
    this.isMovingUp = event.value === 1;
    this.handleMovementActionWithDelay();
  }

  /**
   * Derives movement from both direction flags; conflicting or inactive flags report stopped.
   * @returns {WindowCovering.MovementStatus} The current lift movement status.
   */
  private get operationalStatus(): WindowCovering.MovementStatus {
    if (this.isMovingUp === this.isMovingDown) return WindowCovering.MovementStatus.Stopped;
    return this.isMovingUp ? WindowCovering.MovementStatus.Opening : WindowCovering.MovementStatus.Closing;
  }

  handleMovementActionWithDelay(): void {
    if (this.updatePending) return;

    this.updatePending = true;

    setTimeout(() => {
      void this.updateMovementStatusWithDelay();
    }, 100);
  }

  private async updateMovementStatusWithDelay(): Promise<void> {
    this.Endpoint.log.info(`Updating operational status: ${this.operationalStatus}, target: ${this.targetPosition}`);

    await this.Endpoint.updateAttribute(WindowCovering.id, 'targetPositionLiftPercent100ths', this.targetPosition, this.Endpoint.log);
    await this.Endpoint.updateAttribute(
      WindowCovering.id,
      'operationalStatus',
      {
        global: this.operationalStatus,
        lift: this.operationalStatus,
        tilt: WindowCovering.MovementStatus.Stopped,
      },
      this.Endpoint.log,
    );
    this.updatePending = false;
  }

  private async updateAttributesFromInternalState(): Promise<void> {
    await this.Endpoint.updateAttribute(WindowCovering.id, 'currentPositionLiftPercent100ths', this.currentPosition, this.Endpoint.log);
    await this.Endpoint.updateAttribute(WindowCovering.id, 'targetPositionLiftPercent100ths', this.targetPosition, this.Endpoint.log);
    await this.Endpoint.updateAttribute(
      WindowCovering.id,
      'operationalStatus',
      {
        global: this.operationalStatus,
        lift: this.operationalStatus,
        tilt: WindowCovering.MovementStatus.Stopped,
      },
      this.Endpoint.log,
    );
  }

  override async populateInitialState(): Promise<void> {
    const latestPositionValueEvent = this.getLatestValueEvent('position');
    const latestTargetPositionValueEvent = this.getLatestValueEvent('targetPosition');
    const latestUpValueEvent = this.getLatestValueEvent('up');
    const latestDownValueEvent = this.getLatestValueEvent('down');

    this.currentPosition = latestPositionValueEvent.value * 10000;
    this.targetPosition = latestTargetPositionValueEvent.value * 10000;
    this.isMovingUp = latestUpValueEvent.value === 1;
    this.isMovingDown = latestDownValueEvent.value === 1;

    await this.updateAttributesFromInternalState();
  }

  static override typeNames(): string[] {
    return ['shade', 'windowshade', 'shading'];
  }
}

export { WindowShade };
