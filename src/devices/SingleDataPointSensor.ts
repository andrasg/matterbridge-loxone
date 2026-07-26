import { bridgedNode, type DeviceTypeDefinition, powerSource } from "matterbridge";
import type { ClusterId } from "matterbridge/matter";
import type { LoxonePlatform } from "../LoxonePlatform.js";
import { LoxoneDevice } from "./LoxoneDevice.js";
import LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type LoxoneTextEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";

export const ValueOnlyStateNames = {
  value: "value",
} as const;
export const ValueOnlyStateNameKeys = Object.values(ValueOnlyStateNames);
export type ValueOnlyStateNamesType =
  (typeof ValueOnlyStateNames)[keyof typeof ValueOnlyStateNames];

export const ActiveOnlyStateNames = {
  active: "active",
} as const;
export const ActiveOnlyStateNameKeys = Object.values(ActiveOnlyStateNames);
export type ActiveOnlyStateNamesType =
  (typeof ActiveOnlyStateNames)[keyof typeof ActiveOnlyStateNames];

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
    super(
      control,
      platform,
      [sensorDeviceType, bridgedNode, powerSource],
      [stateName],
      shortTypeName,
      `${className}_${control.structureSection.uuidAction.replace(/-/g, "_")}`,
    );

    this.clusterId = clusterId;
    this.attributeName = attributeName;
    this.singleStateName = stateName;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract valueConverter(
    event: LoxoneValueEvent | undefined,
  ): number | boolean | { occupied: boolean };

  override async handleLoxoneDeviceEvent(event: LoxoneValueEvent | LoxoneTextEvent): Promise<void> {
    if (!(event instanceof LoxoneValueEvent)) return;

    await this.updateAttributesFromLoxoneEvent(event);
  }

  override async populateInitialState(): Promise<void> {
    const latestEvent = this.getLatestValueEvent(this.singleStateName);
    await this.updateAttributesFromLoxoneEvent(latestEvent);
  }

  private async updateAttributesFromLoxoneEvent(event: LoxoneValueEvent): Promise<void> {
    const value = this.valueConverter(event);
    await this.Endpoint.updateAttribute(
      this.clusterId,
      this.attributeName,
      value,
      this.Endpoint.log,
    );
  }
}

export { SingleDataPointSensor };
