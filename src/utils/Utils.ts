import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';

export function getEvents<T extends LoxoneValueEvent | LoxoneTextEvent>(events: (LoxoneValueEvent | LoxoneTextEvent)[], uuidFilter: string | undefined = undefined): T[] {
  return events.filter<T>((event): event is T => {
    if (uuidFilter !== undefined) {
      return event.uuid.stringValue === uuidFilter;
    } else {
      return true;
    }
  });
}

export function getLatestEvent<T extends LoxoneValueEvent | LoxoneTextEvent>(
  events: (LoxoneValueEvent | LoxoneTextEvent)[],
  uuidFilter: string | undefined = undefined,
): T | undefined {
  return events
    .sort((a, b) => {
      return b.date.getTime() - a.date.getTime();
    })
    .find<T>((event): event is T => {
      if (uuidFilter !== undefined) {
        return event.uuid.stringValue === uuidFilter;
      } else {
        return true;
      }
    });
}

export function getAllEvents<T extends LoxoneValueEvent | LoxoneTextEvent>(
  events: (LoxoneValueEvent | LoxoneTextEvent)[],
  uuidFilter: string[] | string | undefined = undefined,
): T[] {
  return events
    .filter<T>((event): event is T => {
      if (uuidFilter !== undefined) {
        if (Array.isArray(uuidFilter)) {
          return uuidFilter.includes(event.uuid.stringValue);
        } else {
          return event.uuid.stringValue === uuidFilter;
        }
      } else {
        return true;
      }
    })
    .sort((a, b) => {
      return b.date.getTime() - a.date.getTime();
    });
}

export function getLatestTextEvent(events: (LoxoneValueEvent | LoxoneTextEvent)[], uuidFilter: string | undefined = undefined) {
  return getLatestEvent<LoxoneTextEvent>(events, uuidFilter);
}

export function getLatestValueEvent(events: (LoxoneValueEvent | LoxoneTextEvent)[], uuidFilter: string | undefined = undefined) {
  return getLatestEvent<LoxoneValueEvent>(events, uuidFilter);
}
