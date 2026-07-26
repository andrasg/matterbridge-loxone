class MatterLevelInfo {
  loxoneLevel = 0;
  matterLevel = 1;

  constructor(event: number) {
    this.calculateLevel(event);
  }

  static fromMatterNumber(event: number): MatterLevelInfo {
    return new MatterLevelInfo(event);
  }

  private calculateLevel(event: number): void {
    this.matterLevel = event;
    this.loxoneLevel = this.convertMatterToLoxone(event);
  }

  convertMatterToLoxone(value: number): number {
    const scaledValue = Math.round(value / 2.54);
    return Math.min(Math.max(scaledValue, 0), 100);
  }
}

export { MatterLevelInfo };
