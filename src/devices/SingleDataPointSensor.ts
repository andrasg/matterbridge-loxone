import { bridgedNode, type DeviceTypeDefinition, powerSource } from "matterbridge";
import type { ClusterId } from "matterbridge/matter";
import type { DeviceHost } from "./DeviceHost.js";
import { LoxoneDevice } from "./LoxoneDevice.js";
import LoxoneValueEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js";
import type LoxoneTextEvent from "loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js";
import type Control from "loxone-ts-api/dist/Structure/Control.js";

export const VALUE_ONLY_STATE_NAMES = ["value"] as const;
export type ValueOnlyStateNamesType = (typeof VALUE_ONLY_STATE_NAMES)[number];

export const ACTIVE_ONLY_STATE_NAMES = ["active"] as const;
export type ActiveOnlyStateNamesType = (typeof ACTIVE_ONLY_STATE_NAMES)[number];

abstract class SingleDataPointSensor<T extends string = string> extends LoxoneDevice<T> {
  clusterId: ClusterId;
  attributeName: string;
  singleStateName: T;

  constructor(
    control: Control,
    host: DeviceHost,
    className: string,
    shortTypeName: string,
    stateName: T,
    sensorDeviceType: DeviceTypeDefinition,
    clusterId: ClusterId,
    attributeName: string,
  ) {
    super(
      control,
      host,
      [sensorDeviceType, bridgedNode, powerSource],
      [stateName],
      shortTypeName,
      `${className}_${control.structureSection.uuidAction.replace(/-/g, "_")}`,
    );

    this.clusterId = clusterId;
    this.attributeName = attributeName;
    this.singleStateName = stateName;
  }

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
