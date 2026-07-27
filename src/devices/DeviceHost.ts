import type { AnsiLogger } from "matterbridge/logger";
import type State from "loxone-ts-api/dist/Structure/State.js";
import type { LoxonePlatformConfig } from "../LoxonePlatformConfig.js";

/**
 * Narrow contract the device layer needs from its host.
 *
 * This interface is owned by the device layer so that no module under `devices/` has to import
 * `LoxonePlatform`. That inverts the platform dependency and keeps the module graph acyclic:
 * the platform depends on the devices, never the other way around. It also keeps the raw
 * `LoxoneClient` out of reach of devices, which may only talk to Loxone through this interface.
 */
export interface DeviceHost {
  /** Logger used for platform level messages. Endpoints have their own logger. */
  readonly log: AnsiLogger;

  /** The validated plugin configuration. */
  readonly config: LoxonePlatformConfig;

  /** The plugin version, or an empty string when unknown. */
  readonly version: string;

  /** The version of the running Matterbridge instance. */
  readonly matterbridgeVersion: string;

  /**
   * Looks up a Loxone state by its UUID.
   *
   * @param {string} uuid The state UUID as a string.
   *
   * @returns {State | undefined} The state, or `undefined` when no state with that UUID exists.
   */
  getState(uuid: string): State | undefined;

  /**
   * Sends a command to a Loxone control.
   *
   * @param {string} uuidAction The UUID of the control to send the command to.
   * @param {string} command The Loxone command string, e.g. `on`, `off` or `setTarget/21`.
   *
   * @returns {Promise<void>} Resolves once the command has been sent.
   */
  sendControlCommand(uuidAction: string, command: string): Promise<void>;
}
