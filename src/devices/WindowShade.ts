import { bridgedNode, powerSource, coverDevice } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { WindowCovering } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';

class WindowShade extends LoxoneDevice {
  private operationalStatus: WindowCovering.MovementStatus = WindowCovering.MovementStatus.Stopped;
  private currentPosition = 0;
  private targetPosition = 0;
  private updatePending = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      [coverDevice, bridgedNode, powerSource],
      [structureSection.states.position, structureSection.states.targetPosition, structureSection.states.up, structureSection.states.down],
      'window covering',
      `${WindowShade.name}_${structureSection.uuidAction.replace(/-/g, '_')}`,
    );

    const latestValueEvent = this.getLatestValueEvent(structureSection.states.position);
    this.currentPosition = latestValueEvent ? latestValueEvent.value * 10000 : 0;

    this.Endpoint.createDefaultWindowCoveringClusterServer(this.currentPosition);

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

  override async handleLoxoneDeviceEvent(event: LoxoneUpdateEvent) {
    if (!(event instanceof LoxoneValueUpdateEvent)) return;

    switch (event.uuid) {
      case this.structureSection.states.up:
        this.handleUpwardMovement(event);
        break;
      case this.structureSection.states.down:
        this.handleDownwardMovement(event);
        break;
      case this.structureSection.states.position:
        await this.handlePositionUpdate(event);
        break;
      case this.structureSection.states.targetPosition:
        this.handleTargetPositionUpdate(event);
        break;
      default:
        this.Endpoint.log.warn(`Unhandled event: ${event.uuid}`);
    }
  }

  private handleTargetPositionUpdate(event: LoxoneValueUpdateEvent) {
    this.targetPosition = event.value * 10000;
    this.Endpoint.log.info(`Target position: ${this.targetPosition}`);
  }

  private async handlePositionUpdate(event: LoxoneValueUpdateEvent) {
    this.currentPosition = event.value * 10000;
    this.Endpoint.log.info(`Current position: ${this.currentPosition}`);
    await this.Endpoint.updateAttribute(WindowCovering.Cluster.id, 'currentPositionLiftPercent100ths', this.currentPosition, this.Endpoint.log);
  }

  private handleDownwardMovement(event: LoxoneValueUpdateEvent) {
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

  private async handleUpwardMovement(event: LoxoneValueUpdateEvent) {
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

  override async populateInitialState() {
    const latestPositionValueEvent = this.getLatestValueEvent(this.structureSection.states.position);
    const latestTargetPositionValueEvent = this.getLatestValueEvent(this.structureSection.states.targetPosition);
    const latestUpValueEvent = this.getLatestValueEvent(this.structureSection.states.up);
    const latestDownValueEvent = this.getLatestValueEvent(this.structureSection.states.down);

    if (!latestPositionValueEvent || !latestTargetPositionValueEvent || !latestUpValueEvent || !latestDownValueEvent) {
      this.Endpoint.log.warn(`No initial value event found for ${this.longname}`);
      return;
    }
    this.currentPosition = latestPositionValueEvent.value * 10000;
    this.targetPosition = latestPositionValueEvent.value * 10000;
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
}

export { WindowShade };
