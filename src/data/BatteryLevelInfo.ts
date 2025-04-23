import { PowerSource } from 'matterbridge/matter/clusters';
import { LoxoneValueUpdateEvent } from './LoxoneValueUpdateEvent.js';

class BatteryLevelInfo {
  batteryRemaining = 200;
  batteryStatus: PowerSource.BatChargeLevel = PowerSource.BatChargeLevel.Ok;

  constructor(event: LoxoneValueUpdateEvent | undefined) {
    this.calculateLevel(event);
  }

  static fromEvent(event: LoxoneValueUpdateEvent | undefined) {
    return new BatteryLevelInfo(event);
  }

  private calculateLevel(event: LoxoneValueUpdateEvent | undefined) {
    if (event === undefined) return;

    this.batteryRemaining = Math.round(event.value * 2);
    this.batteryStatus = this.calculateBatteryStatus(this.batteryRemaining);
  }

  private calculateBatteryStatus(batteryRemaining: number) {
    return batteryRemaining > 40 ? PowerSource.BatChargeLevel.Ok : batteryRemaining > 20 ? PowerSource.BatChargeLevel.Warning : PowerSource.BatChargeLevel.Critical;
  }
}

export { BatteryLevelInfo };
