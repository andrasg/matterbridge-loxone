import { LoxoneTextUpdateEvent } from '../data/LoxoneTextUpdateEvent.js';
import { LoxoneUpdateEvent } from '../data/LoxoneUpdateEvent.js';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';

class Utils {
  public static getEvents<T extends LoxoneUpdateEvent>(events: LoxoneUpdateEvent[], uuidFilter: string | undefined = undefined): T[] {
    return events.filter<T>((event): event is T => {
      if (uuidFilter !== undefined) {
        return event.uuid === uuidFilter;
      } else {
        return true;
      }
    });
  }

  public static getLatestEvent<T extends LoxoneUpdateEvent>(events: LoxoneUpdateEvent[], uuidFilter: string | undefined = undefined): T | undefined {
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

  public static getLatestTextEvent(events: LoxoneUpdateEvent[], uuidFilter: string | undefined = undefined) {
    return this.getLatestEvent<LoxoneTextUpdateEvent>(events, uuidFilter);
  }

  public static getLatestValueEvent(events: LoxoneUpdateEvent[], uuidFilter: string | undefined = undefined) {
    return this.getLatestEvent<LoxoneValueUpdateEvent>(events, uuidFilter);
  }
}

export { Utils };
