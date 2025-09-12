import { bridgedNode, DeviceTypeDefinition, powerSource } from 'matterbridge';
import { ClusterId } from 'matterbridge/matter';
import { LoxonePlatform } from '../platform.js';
import { LoxoneDevice } from './LoxoneDevice.js';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import Control from 'loxone-ts-api/dist/Structure/Control.js';

export const ValueOnlyStateNames = {
  value: 'value',
} as const;
export const ValueOnlyStateNameKeys = Object.values(ValueOnlyStateNames) as (typeof ValueOnlyStateNames)[keyof typeof ValueOnlyStateNames][];
export type ValueOnlyStateNamesType = (typeof ValueOnlyStateNames)[keyof typeof ValueOnlyStateNames];

export const ActiveOnlyStateNames = {
  active: 'active',
} as const;
export const ActiveOnlyStateNameKeys = Object.values(ActiveOnlyStateNames) as (typeof ActiveOnlyStateNames)[keyof typeof ActiveOnlyStateNames][];
export type ActiveOnlyStateNamesType = (typeof ActiveOnlyStateNames)[keyof typeof ActiveOnlyStateNames];

abstract class SingleDataPointSensor<T extends string = string> extends LoxoneDevice<T> {
  clusterId: ClusterId;
  attributeName: string;
  singleStateName: T;

  constructor(
    control: Control,
    platform: LoxonePlatform,
    className: string,
    shortTypeName: string,
    stateName: T,
    sensorDeviceType: DeviceTypeDefinition,
    clusterId: ClusterId,
    attributeName: string,
  ) {
    super(control, platform, [sensorDeviceType, bridgedNode, powerSource], [stateName], shortTypeName, `${className}_${control.structureSection.uuidAction.replace(/-/g, '_')}`);

    this.clusterId = clusterId;
    this.attributeName = attributeName;
    this.singleStateName = stateName;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract valueConverter(event: LoxoneValueEvent | undefined): any;

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent) {
    if (!(event instanceof LoxoneValueEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState() {
    const latestEvent = this.getLatestValueEvent(this.singleStateName);
    await this.updateAttributesFromLoxoneEvent(latestEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent) {
    const value = this.valueConverter(event);
    await this.Endpoint.updateAttribute(this.clusterId, this.attributeName, value, this.Endpoint.log);
  }
}

export { SingleDataPointSensor };
