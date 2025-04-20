import LoxoneAPI = require('node-lox-ws-api');
import { EventEmitter } from "events";
import { AnsiLogger } from 'matterbridge/logger';
import { LoxoneValueUpdateEvent } from '../models/LoxoneValueUpdateEvent.js';
import { LoxoneTextUpdateEvent } from '../models/LoxoneTextUpdateEvent.js';

class LoxoneConnection extends EventEmitter {

    private loxoneAPI: any;
    private log: any;

    constructor(loxoneIP: string, loxonePort: number, loxoneUsername: string, loxonePassword: string, log: AnsiLogger) {
        super();
        let host = loxoneIP + ':' + loxonePort;
        let user = loxoneUsername;
        let password = loxonePassword;
        this.loxoneAPI = new LoxoneAPI(host, user, password, true, 'AES-256-CBC' /*'Hash'*/);
        this.log = log;

        this.setupEvents();
    }

    private setupEvents() {
        var that = this;

        this.loxoneAPI.on('connect', function() {
            that.log.info("Loxone connected!");
            that.emit("connect");
        });

        this.loxoneAPI.on('reconnect', function() {
            that.log.info("Loxone reconnecting");
            that.emit("reconnect");
        });

        this.loxoneAPI.on('close', function(info:boolean, reason:string) {
            that.log.info("Loxone closed! (" + reason + ")");
            that.emit("close");
        });

        this.loxoneAPI.on('get_structure_file', function(filedata: any) {
            that.log.info("Got structure file! Last modified: " + filedata.lastModified);
            that.emit("get_structure_file", filedata);
        });

        this.loxoneAPI.on('send', function(message: any) {
            that.log.debug("Sent message");
            that.emit("send");
        });

        this.loxoneAPI.on('abort', function() {
            that.log.error("Loxone aborted!");
        });
        
        this.loxoneAPI.on('close_failed', function() {
            that.log.error("Loxone close failed!");
        });
        
        this.loxoneAPI.on('connect_failed', function(error: any, reason: any) {
            that.log.info('Loxone connect failed!');
        });
        
        this.loxoneAPI.on('connection_error', function(error: any, reason: any) {
            if (error != undefined) {
                that.log.info('Loxone connection error: ' + error.toString());
            }
            else {
                that.log.info('Loxone connection error');
            }
            that.emit("connection_error");
        });
        
        this.loxoneAPI.on('auth_failed', function(error: any) {
            that.log.info('Loxone auth error: ' + JSON.stringify(error));
        });
        
        this.loxoneAPI.on('authorized', function() {
            that.log.info('Loxone authorized');
            that.emit("authorized");
        });
        
        this.loxoneAPI.on('update_event_value', function(uuid: any, evt: any) {
            that.emit("update_value", new LoxoneValueUpdateEvent(uuid, evt));
        });

        this.loxoneAPI.on('update_event_text', function(uuid: any, evt: any) {
            that.emit("update_text", new LoxoneTextUpdateEvent(uuid, evt));
        });

    }

    connect() {
        this.log.info('Loxone connecting');
        this.loxoneAPI.connect();
    }

    disconnect() {
        this.log.info('Loxone disconnecting');
        this.loxoneAPI.close();
    }

    sendCommand(command: string, payload: any) {
        this.loxoneAPI.send_cmd(command, payload);
    }

    isConnected(): boolean {
        return this.loxoneAPI.is_connected();
    }
}

export { LoxoneConnection }