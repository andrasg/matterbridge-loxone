import { LoxoneTextUpdateEvent } from "../models/LoxoneTextUpdateEvent.js";
import { LoxoneUpdateEvent } from "../models/LoxoneUpdateEvent.js";
import { LoxoneValueUpdateEvent } from "../models/LoxoneValueUpdateEvent.js";

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
        return events.find<T>((event): event is T => {
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

export { Utils}