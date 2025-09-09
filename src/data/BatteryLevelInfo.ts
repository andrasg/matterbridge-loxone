import { PowerSource } from 'matterbridge/matter/clusters';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';

class BatteryLevelInfo {
  batteryRemaining = 200;
  batteryStatus: PowerSource.BatChargeLevel = PowerSource.BatChargeLevel.Ok;

  constructor(event: LoxoneValueEvent | undefined) {
    this.calculateLevel(event);
  }

  static fromEvent(event: LoxoneValueEvent | undefined) {
    return new BatteryLevelInfo(event);
  }

  private calculateLevel(event: LoxoneValueEvent | undefined) {
    if (event === undefined) return;

    this.batteryRemaining = Math.round(event.value * 2);
    this.batteryStatus = this.calculateBatteryStatus(this.batteryRemaining);
  }

  private calculateBatteryStatus(batteryRemaining: number) {
    return batteryRemaining > 40 ? PowerSource.BatChargeLevel.Ok : batteryRemaining > 20 ? PowerSource.BatChargeLevel.Warning : PowerSource.BatChargeLevel.Critical;
  }
}

export { BatteryLevelInfo };
