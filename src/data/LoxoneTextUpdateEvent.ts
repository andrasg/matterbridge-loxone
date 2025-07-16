import { LoxoneUpdateEvent } from './LoxoneUpdateEvent.js';

class LoxoneTextUpdateEvent extends LoxoneUpdateEvent {
  text: string;
  type: string;

  constructor(uuid: string, evt: string) {
    super(uuid);
    this.text = evt;
    this.type = 'text';
  }

  override valueString(): string {
    return this.text;
  }
}

export { LoxoneTextUpdateEvent };
