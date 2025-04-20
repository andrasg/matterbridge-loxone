abstract class LoxoneUpdateEvent {
  uuid: string;
  date: Date;
  abstract type: string;

  constructor(uuid: string) {
    this.uuid = uuid;
    this.date = new Date();
  }

  abstract toText(): string;
}

export { LoxoneUpdateEvent };
