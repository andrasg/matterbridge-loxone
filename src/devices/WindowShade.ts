import { bridgedNode, powerSource, coverDevice } from 'matterbridge';
import { LoxonePlatform } from '../platform.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { WindowCovering } from 'matterbridge/matter/clusters';
import { LoxoneDevice } from './LoxoneDevice.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';

class WindowShade extends LoxoneDevice {
  private operationalStatus: WindowCovering.MovementStatus = WindowCovering.MovementStatus.Stopped;
  private currentPosition: number = 0;
  private targetPosition: number = 0;
  private updatePending = false;

  constructor(structureSection: any, platform: LoxonePlatform) {
    super(
      structureSection,
      platform,
      [coverDevice, bridgedNode, powerSource],
      [structureSection.states.position, structureSection.states.targetPosition, structureSection.states.up, structureSection.states.down],
      'window covering',
      `WindowShade-${structureSection.uuidAction}`,
    );

    let latestValueEvent = this.getLatestInitialValueEvent(structureSection.states.position);
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
      let targetNumber = Math.round(liftPercent100thsValue / 100);
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

  override async handleDeviceEvent(event: LoxoneUpdateEvent) {
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
    let oldCurrent = await this.Endpoint.getAttribute(WindowCovering.Cluster.id, 'currentPositionLiftPercent100ths');
    if (oldCurrent !== this.currentPosition)
      await this.Endpoint.setAttribute(WindowCovering.Cluster.id, 'currentPositionLiftPercent100ths', this.currentPosition, this.Endpoint.log);
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

    let that = this;

    setTimeout(async () => {
      that.Endpoint.log.info(`Updating operational status: ${that.operationalStatus}, target: ${that.targetPosition}`);

      await that.Endpoint.setAttribute(WindowCovering.Cluster.id, 'targetPositionLiftPercent100ths', that.targetPosition, that.Endpoint.log);
      await that.Endpoint.setAttribute(
        WindowCovering.Cluster.id,
        'operationalStatus',
        {
          global: that.operationalStatus,
          lift: that.operationalStatus,
          tilt: that.operationalStatus,
        },
        that.Endpoint.log,
      );
      that.updatePending = false;
    }, 100);
  }
}

export { WindowShade };
