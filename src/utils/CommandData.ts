import { MatterbridgeEndpoint, PrimitiveTypes } from 'matterbridge';

/**
 * CommandData helper class representing the parameter of a CommandHandlerFunction..
 * @property {Record<string, any>} request - The request data as a record of key-value pairs.
 * @property {string} cluster - The name of the cluster.
 * @property {Record<string, PrimitiveTypes>} attributes - The attributes as a record of key-value pairs.
 * @property {MatterbridgeEndpoint} endpoint - The Matterbridge endpoint.
 */
export interface CommandData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: Record<string, any>;
  cluster: string;
  attributes: Record<string, PrimitiveTypes>;
  endpoint: MatterbridgeEndpoint;
}
