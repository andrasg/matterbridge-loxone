import { LoxoneTextUpdateEvent } from '../data/LoxoneTextUpdateEvent.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';

export function getEvents<T extends LoxoneUpdateEvent>(events: LoxoneUpdateEvent[], uuidFilter: string | undefined = undefined): T[] {
  return events.filter<T>((event): event is T => {
    if (uuidFilter !== undefined) {
      return event.uuid === uuidFilter;
    } else {
      return true;
    }
  });
}

export function getLatestEvent<T extends LoxoneUpdateEvent>(events: LoxoneUpdateEvent[], uuidFilter: string | undefined = undefined): T | undefined {
  return events
    .sort((a, b) => {
      return b.date.getMilliseconds() - a.date.getMilliseconds();
    })
    .find<T>((event): event is T => {
      if (uuidFilter !== undefined) {
        return event.uuid === uuidFilter;
      } else {
        return true;
      }
    });
}

export function getLatestTextEvent(events: LoxoneUpdateEvent[], uuidFilter: string | undefined = undefined) {
  return getLatestEvent<LoxoneTextUpdateEvent>(events, uuidFilter);
}

export function getLatestValueEvent(events: LoxoneUpdateEvent[], uuidFilter: string | undefined = undefined) {
  return getLatestEvent<LoxoneValueUpdateEvent>(events, uuidFilter);
}
