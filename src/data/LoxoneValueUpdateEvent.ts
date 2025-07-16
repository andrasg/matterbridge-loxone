import { LoxoneUpdateEvent } from './LoxoneUpdateEvent.js';

class LoxoneValueUpdateEvent extends LoxoneUpdateEvent {
  value: number;
  type: string;

  constructor(uuid: string, evt: number) {
    super(uuid);
    this.value = evt;
    this.type = 'value';
  }

  override valueString(): string {
    return this.value.toString();
  }
}

export { LoxoneValueUpdateEvent };
