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
      return b.date.getTime() - a.date.getTime();
    })
    .find<T>((event): event is T => {
      if (uuidFilter !== undefined) {
        return event.uuid === uuidFilter;
      } else {
        return true;
      }
    });
}

export function getAllEvents<T extends LoxoneUpdateEvent>(events: LoxoneUpdateEvent[], uuidFilter: string[] | string | undefined = undefined): T[] {
  return events
    .filter<T>((event): event is T => {
      if (uuidFilter !== undefined) {
        if (Array.isArray(uuidFilter)) {
          return uuidFilter.includes(event.uuid);
        } else {
          return event.uuid === uuidFilter;
        }
      } else {
        return true;
      }
    })
    .sort((a, b) => {
      return b.date.getTime() - a.date.getTime();
    });
}

export function getLatestTextEvent(events: LoxoneUpdateEvent[], uuidFilter: string | undefined = undefined) {
  return getLatestEvent<LoxoneTextUpdateEvent>(events, uuidFilter);
}

export function getLatestValueEvent(events: LoxoneUpdateEvent[], uuidFilter: string | undefined = undefined) {
  return getLatestEvent<LoxoneValueUpdateEvent>(events, uuidFilter);
}
