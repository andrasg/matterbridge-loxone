import { PowerSource } from "matterbridge/matter/clusters";
import type { LoxoneEvent } from "loxone-ts-api/dist/LoxoneEvents/LoxoneEvent.js";
import LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";

class BatteryLevelInfo {
  batteryRemaining = 200;
  batteryStatus: PowerSource.BatChargeLevel = PowerSource.BatChargeLevel.Ok;

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

    this.batteryRemaining = Math.round(event.value * 2);
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
