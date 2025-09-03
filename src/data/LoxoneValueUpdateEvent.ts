import { LoxoneUpdateEvent } from './LoxoneUpdateEvent.js';

class LoxoneValueUpdateEvent extends LoxoneUpdateEvent {
  value: number;
  type: string;

  constructor(uuid: string, evt: number) {
    super(uuid);
    this.value = Math.round(evt * 100) / 100; // cap to two fractional digits
    this.type = 'value';
  }

  override valueString(): string {
    return this.value.toString();
  }
}

export { LoxoneValueUpdateEvent };
