import { LoxoneUpdateEvent } from './LoxoneUpdateEvent.js';

class LoxoneValueUpdateEvent extends LoxoneUpdateEvent {
  value: number;
  type: string;

  constructor(uuid: string, evt: number) {
    super(uuid);
    this.value = evt;
    this.type = 'value';
  }

  override toText(): string {
    return `${this.uuid}: ${this.value}`;
  }
}

export { LoxoneValueUpdateEvent };
