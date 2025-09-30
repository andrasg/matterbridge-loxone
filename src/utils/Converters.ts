import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import { SmokeCoAlarm, Thermostat } from 'matterbridge/matter/clusters';

export function onOffValueConverter(event: LoxoneValueEvent | undefined): boolean {
  return event ? (event.value === 1 ? true : false) : false;
}

export function numberValueConverter(event: LoxoneValueEvent | undefined): number {
  return event ? event.value * 100 : 0;
}

export function booleanValueConverter(event: LoxoneValueEvent | undefined): boolean {
  return event ? event.value === 1 : false;
}

export function alarmStateValueConverter(event: LoxoneValueEvent | undefined): SmokeCoAlarm.AlarmState {
  return event?.value === 1 ? SmokeCoAlarm.AlarmState.Critical : SmokeCoAlarm.AlarmState.Normal;
}

export function systemModeValueConverter(event: LoxoneValueEvent | undefined): Thermostat.SystemMode {
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
