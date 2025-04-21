import { LoxoneValueUpdateEvent } from "./LoxoneValueUpdateEvent.js";

class LoxoneLevelInfo {
    loxoneLevel: number = 0;
    matterLevel: number = 1;
    onOff: boolean = false;

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
            this.matterLevel = this.convertLoxoneValueToMatter(event.value);
            this.onOff = event.value > 0;
            return;
        }

        if (typeof event === 'number') {
            this.loxoneLevel = event;
            this.matterLevel = this.convertLoxoneValueToMatter(event);
            this.onOff = event > 0;
            return;
        }
    }

  convertLoxoneValueToMatter(value: number): number {
    let scaledValue = Math.round(value * 2.54);
    return Math.min(Math.max(scaledValue, 1), 254);
  }
}

export { LoxoneLevelInfo };