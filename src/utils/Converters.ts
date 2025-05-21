import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { Thermostat } from 'matterbridge/matter/clusters';

export function onOffValueConverter(event: LoxoneValueUpdateEvent | undefined): boolean {
  return event ? (event.value === 1 ? true : false) : false;
}

export function temperatureValueConverter(event: LoxoneValueUpdateEvent | undefined): number {
  return event ? event.value * 100 : 0;
}

export function systemModeValueConverter(event: LoxoneValueUpdateEvent | undefined): Thermostat.SystemMode {
  switch (event?.value) {
    case 1:
      return Thermostat.SystemMode.Auto;
    case 2:
      return Thermostat.SystemMode.Heat;
    case 3:
      return Thermostat.SystemMode.Cool;
    case 4:
      return Thermostat.SystemMode.Dry;
    case 5:
      return Thermostat.SystemMode.FanOnly;
    default:
      return Thermostat.SystemMode.Off;
  }
}
