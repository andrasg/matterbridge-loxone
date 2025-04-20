declare module 'node-lox-ws-api' {
  export = LoxoneApi;

  declare class LoxoneApi {
    constructor(host: string, user: string, password: string, secure: boolean, hash: string): void;
  }
}
