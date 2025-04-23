/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-require-imports
import LoxoneAPI = require('node-lox-ws-api');
import { EventEmitter } from 'node:events';
import { AnsiLogger } from 'matterbridge/logger';
import { LoxoneValueUpdateEvent } from '../data/LoxoneValueUpdateEvent.js';
import { LoxoneTextUpdateEvent } from '../data/LoxoneTextUpdateEvent.js';

class LoxoneConnection extends EventEmitter {
  private loxoneAPI: any;
  private log: any;

  constructor(loxoneIP: string, loxonePort: number, loxoneUsername: string, loxonePassword: string, log: AnsiLogger) {
    super();
    const host = loxoneIP + ':' + loxonePort;
    const user = loxoneUsername;
    const password = loxonePassword;
    this.loxoneAPI = new LoxoneAPI(host, user, password, true, 'AES-256-CBC' /* 'Hash'*/);
    this.log = log;

    this.setupEvents();
  }

  private setupEvents() {
    this.loxoneAPI.on('connect', () => {
      this.log.info('Loxone connected!');
      this.emit('connect');
    });

    this.loxoneAPI.on('reconnect', () => {
      this.log.info('Loxone reconnecting');
      this.emit('reconnect');
    });

    this.loxoneAPI.on('close', (info: boolean, reason: string) => {
      this.log.info('Loxone closed! (' + reason + ')');
      this.emit('close');
    });

    this.loxoneAPI.on('get_structure_file', (filedata: any) => {
      this.log.info('Got structure file! Last modified: ' + filedata.lastModified);
      this.emit('get_structure_file', filedata);
    });

    this.loxoneAPI.on('send', (message: any) => {
      this.log.debug('Sent message');
      this.emit('send');
    });

    this.loxoneAPI.on('abort', () => {
      this.log.error('Loxone aborted!');
    });

    this.loxoneAPI.on('close_failed', () => {
      this.log.error('Loxone close failed!');
    });

    this.loxoneAPI.on('connect_failed', (error: any, reason: any) => {
      this.log.info('Loxone connect failed!');
    });

    this.loxoneAPI.on('connection_error', (error: any, reason: any) => {
      if (error != undefined) {
        this.log.info('Loxone connection error: ' + error.toString());
      } else {
        this.log.info('Loxone connection error');
      }
      this.emit('connection_error');
    });

    this.loxoneAPI.on('auth_failed', (error: any) => {
      this.log.info('Loxone auth error: ' + JSON.stringify(error));
    });

    this.loxoneAPI.on('authorized', () => {
      this.log.info('Loxone authorized');
      this.emit('authorized');
    });

    this.loxoneAPI.on('update_event_value', (uuid: any, evt: any) => {
      this.emit('update_value', new LoxoneValueUpdateEvent(uuid, evt));
    });

    this.loxoneAPI.on('update_event_text', (uuid: any, evt: any) => {
      this.emit('update_text', new LoxoneTextUpdateEvent(uuid, evt));
    });
  }

  connect() {
    this.log.info('Loxone connecting');
    this.loxoneAPI.connect();
  }

  disconnect() {
    this.log.info('Loxone disconnecting');
    this.loxoneAPI.abort();
  }

  sendCommand(command: string, payload: any) {
    this.loxoneAPI.send_cmd(command, payload);
  }

  isConnected(): boolean {
    return this.loxoneAPI.is_connected();
  }
}

export { LoxoneConnection };
