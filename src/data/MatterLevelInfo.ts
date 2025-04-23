class MatterLevelInfo {
  loxoneLevel = 0;
  matterLevel = 1;

  constructor(event: number | undefined) {
    this.calculateLevel(event);
  }

  static fromMatterNumber(event: undefined) {
    return new MatterLevelInfo(event);
  }

  private calculateLevel(event: number | undefined) {
    if (event === undefined) return;

    if (typeof event === 'number') {
      this.matterLevel = event;
      this.loxoneLevel = this.convertMatterToLoxone(event);
      return;
    }
  }

  convertMatterToLoxone(value: number | undefined): number {
    if (value === undefined) return 0;
    const scaledValue = Math.round(value / 2.54);
    return Math.min(Math.max(scaledValue, 0), 100);
  }
}

export { MatterLevelInfo };
