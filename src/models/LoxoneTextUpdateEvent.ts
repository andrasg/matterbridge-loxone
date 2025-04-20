import { LoxoneUpdateEvent } from './LoxoneUpdateEvent.js';

class LoxoneTextUpdateEvent extends LoxoneUpdateEvent {
  text: string;
  type: string;

  constructor(uuid: string, evt: string) {
    super(uuid);
    this.text = evt;
    this.type = 'text';
  }

  override toText(): string {
    return `${this.uuid}: ${this.text}`;
  }
}

export { LoxoneTextUpdateEvent };
