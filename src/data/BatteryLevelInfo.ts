import { PowerSource } from "matterbridge/matter/clusters";
import type { LoxoneEvent } from "loxone-ts-api/dist/LoxoneEvents/LoxoneEvent.js";
import LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";

class BatteryLevelInfo {
  batteryPercent = 100;
  batteryRemaining = 200;
  batteryStatus: PowerSource.BatChargeLevel = PowerSource.BatChargeLevel.Ok;
  batteryPercentageAdjusted = false;

  constructor(event: LoxoneEvent | undefined) {
    if (!(event instanceof LoxoneValueEvent))
      throw new Error(`Invalid event type: ${event?.constructor.name}`);
    this.calculateLevel(event);
  }

  static fromEvent(event: LoxoneEvent | undefined): BatteryLevelInfo {
    return new BatteryLevelInfo(event);
  }

  private calculateLevel(event: LoxoneEvent | undefined): void {
    if (event === undefined) return;
    if (!(event instanceof LoxoneValueEvent))
      throw new Error(`Invalid event type: ${event?.constructor.name}`);

    this.batteryPercentageAdjusted =
      !Number.isFinite(event.value) || event.value < 0 || event.value > 100;
    const batteryPercent = Number.isFinite(event.value)
      ? Math.min(Math.max(event.value, 0), 100)
      : 0;
    this.batteryRemaining = Math.round(batteryPercent * 2);
    this.batteryPercent = this.batteryRemaining / 2;
    this.batteryStatus = this.calculateBatteryStatus(this.batteryRemaining);
  }

  private calculateBatteryStatus(batteryRemaining: number): PowerSource.BatChargeLevel {
    return batteryRemaining > 40
      ? PowerSource.BatChargeLevel.Ok
      : batteryRemaining > 20
        ? PowerSource.BatChargeLevel.Warning
        : PowerSource.BatChargeLevel.Critical;
  }
}

export { BatteryLevelInfo };
