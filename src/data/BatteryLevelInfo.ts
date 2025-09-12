import { PowerSource } from 'matterbridge/matter/clusters';
import { LoxoneEvent } from 'loxone-ts-api/dist/LoxoneEvents/LoxoneEvent.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';

class BatteryLevelInfo {
  batteryRemaining = 200;
  batteryStatus: PowerSource.BatChargeLevel = PowerSource.BatChargeLevel.Ok;

  constructor(event: LoxoneEvent | undefined) {
    if (!(event instanceof LoxoneValueEvent)) throw new Error(`Invalid event type: ${event?.constructor.name}`);
    this.calculateLevel(event);
  }

  static fromEvent(event: LoxoneEvent | undefined) {
    return new BatteryLevelInfo(event);
  }

  private calculateLevel(event: LoxoneEvent | undefined) {
    if (event === undefined) return;
    if (!(event instanceof LoxoneValueEvent)) throw new Error(`Invalid event type: ${event?.constructor.name}`);

    this.batteryRemaining = Math.round(event.value * 2);
    this.batteryStatus = this.calculateBatteryStatus(this.batteryRemaining);
  }

  private calculateBatteryStatus(batteryRemaining: number) {
    return batteryRemaining > 40 ? PowerSource.BatChargeLevel.Ok : batteryRemaining > 20 ? PowerSource.BatChargeLevel.Warning : PowerSource.BatChargeLevel.Critical;
  }
}

export { BatteryLevelInfo };
