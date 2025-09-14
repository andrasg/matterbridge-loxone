import { bridgedNode, powerSource, coverDevice, MatterbridgeEndpoint } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { WindowCovering } from 'matterbridge/matter/clusters';
import { LoxoneDevice, RegisterLoxoneDevice } from './LoxoneDevice.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

const StateNames = {
  up: 'up',
  down: 'down',
  position: 'position',
  targetPosition: 'targetPosition',
} as const;
type StateNameType = (typeof StateNames)[keyof typeof StateNames];
const StateNameKeys = Object.values(StateNames) as StateNameType[];

class WindowShade extends LoxoneDevice<StateNameType> {
  public Endpoint: MatterbridgeEndpoint;

  private operationalStatus: WindowCovering.MovementStatus = WindowCovering.MovementStatus.Stopped;
  private currentPosition = 0;
  private targetPosition = 0;
  private updatePending = false;

  constructor(control: Control, platform: LoxonePlatform) {
    super(
      control,
      platform,
      [coverDevice, bridgedNode, powerSource],
      StateNameKeys,
      'window covering',
      `${WindowShade.name}_${control.structureSection.uuidAction.replace(/-/g, '_')}`,
    );

    const latestValueEvent = this.getLatestValueEvent(StateNames.position);
    this.currentPosition = latestValueEvent ? latestValueEvent.value * 10000 : 0;

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
    this.addLoxoneCommandHandler('goToLiftPercentage', ({ request: { liftPercent100thsValue } }) => {
      const targetNumber = Math.round(liftPercent100thsValue / 100);
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

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent) {
    if (!(event instanceof LoxoneValueEvent)) return;

    switch (event.state?.name) {
      case StateNames.up:
        this.handleUpwardMovement(event);
        break;
      case StateNames.down:
        this.handleDownwardMovement(event);
        break;
      case StateNames.position:
        await this.handlePositionUpdate(event);
        break;
      case StateNames.targetPosition:
        this.handleTargetPositionUpdate(event);
        break;
      default:
        this.Endpoint.log.warn(`Unhandled event: ${event.uuid}`);
    }
  }

  private handleTargetPositionUpdate(event: LoxoneValueEvent) {
    this.targetPosition = event.value * 10000;
    this.Endpoint.log.info(`Target position: ${this.targetPosition}`);
    // not updating Matter status, as it will be updated by the up/down event;
  }

  private async handlePositionUpdate(event: LoxoneValueEvent) {
    this.currentPosition = event.value * 10000;
    this.Endpoint.log.info(`Current position: ${this.currentPosition}`);
    await this.Endpoint.updateAttribute(WindowCovering.Cluster.id, 'currentPositionLiftPercent100ths', this.currentPosition, this.Endpoint.log);
  }

  private handleDownwardMovement(event: LoxoneValueEvent) {
    if (event.value === 1) {
      this.Endpoint.log.info(`Moving up`);
      this.operationalStatus = WindowCovering.MovementStatus.Closing;
      this.handleMovementActionWithDelay();
    } else {
      this.Endpoint.log.info(`Stopping`);
      this.operationalStatus = WindowCovering.MovementStatus.Stopped;
      this.handleMovementActionWithDelay();
    }
  }

  private async handleUpwardMovement(event: LoxoneValueEvent) {
    if (event.value === 1) {
      this.Endpoint.log.info(`Moving up`);
      this.operationalStatus = WindowCovering.MovementStatus.Opening;
      this.handleMovementActionWithDelay();
    } else {
      this.Endpoint.log.info(`Stopping`);
      this.operationalStatus = WindowCovering.MovementStatus.Stopped;
      this.handleMovementActionWithDelay();
    }
  }

  handleMovementActionWithDelay() {
    if (this.updatePending) return;

    this.updatePending = true;

    setTimeout(async () => {
      this.Endpoint.log.info(`Updating operational status: ${this.operationalStatus}, target: ${this.targetPosition}`);

      await this.Endpoint.updateAttribute(WindowCovering.Cluster.id, 'targetPositionLiftPercent100ths', this.targetPosition, this.Endpoint.log);
      await this.Endpoint.updateAttribute(
        WindowCovering.Cluster.id,
        'operationalStatus',
        {
          global: this.operationalStatus,
          lift: this.operationalStatus,
          tilt: this.operationalStatus,
        },
        this.Endpoint.log,
      );
      this.updatePending = false;
    }, 100);
  }

  private async updateAttributesFromInternalState() {
    await this.Endpoint.updateAttribute(WindowCovering.Cluster.id, 'currentPositionLiftPercent100ths', this.currentPosition, this.Endpoint.log);
    await this.Endpoint.updateAttribute(WindowCovering.Cluster.id, 'targetPositionLiftPercent100ths', this.targetPosition, this.Endpoint.log);
    await this.Endpoint.updateAttribute(
      WindowCovering.Cluster.id,
      'operationalStatus',
      {
        global: this.operationalStatus,
        lift: this.operationalStatus,
        tilt: this.operationalStatus,
      },
      this.Endpoint.log,
    );
  }

  override async populateInitialState() {
    const latestPositionValueEvent = this.getLatestValueEvent(StateNames.position);
    const latestTargetPositionValueEvent = this.getLatestValueEvent(StateNames.targetPosition);
    const latestUpValueEvent = this.getLatestValueEvent(StateNames.up);
    const latestDownValueEvent = this.getLatestValueEvent(StateNames.down);

    this.currentPosition = latestPositionValueEvent.value * 10000;
    this.targetPosition = latestTargetPositionValueEvent.value * 10000;
    if (latestUpValueEvent.value === 0 && latestDownValueEvent.value === 0) {
      this.operationalStatus = WindowCovering.MovementStatus.Stopped;
    } else if (latestUpValueEvent.value === 1) {
      this.operationalStatus = WindowCovering.MovementStatus.Opening;
    } else if (latestDownValueEvent.value === 1) {
      this.operationalStatus = WindowCovering.MovementStatus.Closing;
    } else {
      this.Endpoint.log.warn(`Invalid operational status for ${this.longname}`);
      this.operationalStatus = WindowCovering.MovementStatus.Stopped;
    }

    this.updateAttributesFromInternalState();
  }

  static override typeNames(): string[] {
    return ['shade', 'windowshade', 'shading'];
  }
}

RegisterLoxoneDevice(WindowShade);

export { WindowShade };
