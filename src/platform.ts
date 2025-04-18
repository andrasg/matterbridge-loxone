import { Matterbridge, MatterbridgeDynamicPlatform, MatterbridgeEndpoint, PlatformConfig } from 'matterbridge';
import { AnsiLogger, dn, gn, db, wr, zb, payloadStringify, rs, debugStringify, CYAN, er, nf } from 'matterbridge/logger';
import { isValidNumber, isValidString, waiter } from 'matterbridge/utils';
import { BridgedDeviceBasicInformation, DoorLock } from 'matterbridge/matter/clusters';
import path from 'node:path';


export class LoxonePlatform extends MatterbridgeDynamicPlatform {

    public debugEnabled: boolean;
    public shouldStart: boolean;
    public shouldConfigure: boolean;
    private loxoneHost: string | undefined = undefined;
    private loxonePort = 8080;
    private loxoneUsername: string | undefined = undefined;
    private loxonePassword: string | undefined = undefined;

    constructor(matterbridge: Matterbridge, log: AnsiLogger, config: PlatformConfig) {
        super(matterbridge, log, config);

        this.log.info('Initializing Loxone platform');

        this.debugEnabled = config.debug as boolean;
        this.shouldStart = false;
        this.shouldConfigure = false;

        if (config.host) this.loxoneHost = config.host as string;
        if (config.port) this.loxonePort = config.port as number;
        if (config.username) this.loxoneUsername = config.username as string;
        if (config.password) this.loxonePassword = config.password as string;

        if (!isValidString(this.loxoneHost) || !isValidNumber(this.loxonePort, 1, 65535)) {
            this.log.error(`Loxone host: ${this.loxoneHost} or port: ${this.loxonePort} is not set.`);
        }
    }    

    override async onStart(reason?: string) {
        this.log.info(`Starting Loxone dynamic platform v${this.version}: ` + reason);    
    }

    override async onConfigure() {
        await super.onConfigure();
        this.log.info(`Running onConfigure`);    
    }

    override async onShutdown(reason?: string) {
        await super.onShutdown(reason);
        this.log.info('Shutting down Loxone platform: ' + reason);
    }
}
