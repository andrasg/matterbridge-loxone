import { LoxoneValueUpdateEvent } from './LoxoneValueUpdateEvent.js';

class LoxoneLevelInfo {
  loxoneLevel = 0;
  matterLevel = 1;
  onOff = false;

  constructor(event: LoxoneValueUpdateEvent | number | undefined) {
    this.calculateLevel(event);
  }

  static fromLoxoneEvent(event: LoxoneValueUpdateEvent | undefined) {
    return new LoxoneLevelInfo(event);
  }

  private calculateLevel(event: LoxoneValueUpdateEvent | number | undefined) {
    if (event === undefined) return;

    if (event instanceof LoxoneValueUpdateEvent) {
      this.loxoneLevel = event.value;
    } else if (typeof event === 'number') {
      this.loxoneLevel = event;
    }

    this.matterLevel = this.convertLoxoneValueToMatter(this.loxoneLevel);
    this.onOff = this.loxoneLevel !== 0;
    return;
  }

  convertLoxoneValueToMatter(value: number): number {
    const scaledValue = Math.round(value * 2.54);
    return Math.min(Math.max(scaledValue, 1), 254);
  }
}

export { LoxoneLevelInfo };
