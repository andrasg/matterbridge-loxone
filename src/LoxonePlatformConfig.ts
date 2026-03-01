import { PlatformConfig } from 'matterbridge';

export type LoxonePlatformConfig = PlatformConfig & {
  host: string;
  port: number;
  username: string;
  password: string;
  uuidsandtypes: string[];
  logevents: boolean;
  dumpcontrols: boolean;
  dumpstates: boolean;
};
